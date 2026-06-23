import { attachment } from "./attachment.schema";
import { minioClient, BUCKET_NAME, toPublicUrl } from "../../infra/minio";
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

    const presignedUrl = await minioClient.presignedPutObject(
      BUCKET_NAME,
      storageKey,
      15 * 60,
    );

    return {
      uploadUrl: toPublicUrl(presignedUrl),
      storageKey,
      filename: safeFilename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    };
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

    const downloadUrl = await minioClient.presignedGetObject(
      BUCKET_NAME,
      att.storageKey,
      5 * 60,
      { "response-content-disposition": `attachment; filename="${att.filename}"` },
    );

    return toPublicUrl(downloadUrl);
  },
};
