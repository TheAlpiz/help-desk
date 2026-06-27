import { attachment } from "./attachment.schema";
import { auditLog } from "../audit-log/audit-log.schema";
import { minioClient, minioPresignClient, BUCKET_NAME } from "../../infra/minio";
import { v4 as uuidv4 } from "uuid";
import { UploadRequestInput, ConfirmUploadInput } from "@help-desk/shared";
import { eq, and } from "drizzle-orm";
import { withTenantTransaction } from "../../infra/db";

export const AttachmentService = {
  requestUploadUrl: async (
    tenantId: string,
    actorId: string,
    input: UploadRequestInput,
  ) => {
    const safeFilename = input.filename.replace(/[^a-zA-Z0-9.\-_]/g, "");
    const storageKey = `${tenantId}/${input.entityType.toLowerCase()}/${input.entityId}/${uuidv4()}-${safeFilename}`;

    const presignedUrl = await minioPresignClient.presignedPutObject(
      BUCKET_NAME,
      storageKey,
      15 * 60,
    );

    return {
      uploadUrl: presignedUrl,
      storageKey,
      filename: safeFilename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    };
  },

  // Stage an upload: the browser sends the file to the API, which streams it to
  // MinIO server-side (no browser→MinIO CORS). Returns the storage key + metadata
  // but creates no DB row yet — the caller links it to an entity later via
  // `confirmUpload` once the parent (e.g. a chat message) exists.
  stageUpload: async (
    tenantId: string,
    input: { buffer: Buffer; filename: string; mimeType: string; sizeBytes: number },
  ) => {
    const safeFilename = input.filename.replace(/[^a-zA-Z0-9.\-_]/g, "");
    const storageKey = `${tenantId}/staged/${uuidv4()}-${safeFilename}`;

    await minioClient.putObject(BUCKET_NAME, storageKey, input.buffer, input.sizeBytes, {
      "Content-Type": input.mimeType,
    });

    return { storageKey, filename: safeFilename, mimeType: input.mimeType, sizeBytes: input.sizeBytes };
  },

  confirmUpload: async (
    tenantId: string,
    actorId: string,
    input: ConfirmUploadInput,
    meta: {
      entityType: string;
      entityId: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
    },
  ) => {
    try {
      await minioClient.statObject(BUCKET_NAME, input.storageKey);
    } catch {
      throw new Error("File not found in storage. Upload may have failed or timed out.");
    }

    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx
        .insert(attachment)
        .values({
          organizationId: tenantId,
          uploaderId: actorId,
          storageKey: input.storageKey,
          entityType: meta.entityType,
          entityId: meta.entityId,
          filename: meta.filename,
          mimeType: meta.mimeType,
          sizeBytes: meta.sizeBytes,
        })
        .returning();
      return result[0];
    });
  },

  findByEntity: async (tenantId: string, entityType: string, entityId: string) => {
    return withTenantTransaction(tenantId, async (tx) =>
      tx
        .select()
        .from(attachment)
        .where(
          and(
            eq(attachment.organizationId, tenantId),
            eq(attachment.entityType, entityType),
            eq(attachment.entityId, entityId),
          ),
        ),
    );
  },

  getDownloadUrl: async (tenantId: string, attachmentId: string) => {
    const [att] = await withTenantTransaction(tenantId, async (tx) =>
      tx
        .select()
        .from(attachment)
        .where(and(eq(attachment.id, attachmentId), eq(attachment.organizationId, tenantId)))
        .limit(1),
    );

    if (!att) throw new Error("Attachment not found");
    if (att.isSafe === false) throw new Error("Attachment is quarantined due to malware detection.");

    const downloadUrl = await minioPresignClient.presignedGetObject(
      BUCKET_NAME,
      att.storageKey,
      5 * 60,
      { "response-content-disposition": `attachment; filename="${att.filename}"` },
    );

    return downloadUrl;
  },

  delete: async (tenantId: string, attachmentId: string, actorId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [att] = await tx
        .select()
        .from(attachment)
        .where(and(eq(attachment.id, attachmentId), eq(attachment.organizationId, tenantId)))
        .limit(1);

      if (!att) throw new Error("Attachment not found");

      await tx.delete(attachment).where(eq(attachment.id, attachmentId));

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "attachment",
        entityId: attachmentId,
        actorId,
        action: "deleted",
        oldValues: att,
      });

      // Remove the object from MinIO after the DB row is gone. Done last so a
      // storage failure doesn't leave a dangling DB row; a failed delete here
      // only orphans the object, which the archival worker can sweep later.
      try {
        await minioClient.removeObject(BUCKET_NAME, att.storageKey);
      } catch (err) {
        console.error(`MinIO: failed to remove ${att.storageKey}`, err);
      }

      return { id: attachmentId };
    });
  },
};
