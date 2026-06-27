import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { AttachmentService } from "./attachment.service";
import { uploadRequestSchema, confirmUploadSchema } from "@help-desk/shared";

const confirmSchema = confirmUploadSchema.extend({
  entityType: z.string(),
  entityId: z.string().uuid(),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
});

export const attachmentRouter = new Hono<{ Variables: { tenantId: string; user: JwtPayload } }>()
  .use("*", authMiddleware())
  // List attachments for an entity
  .get("/", async (c) => {
    const tenantId = c.get("tenantId");
    const entityType = c.req.query("entityType");
    const entityId = c.req.query("entityId");

    if (!entityType || !entityId) {
      return ResponseHandler.badRequest(c, "entityType and entityId are required");
    }

    try {
      const result = await AttachmentService.findByEntity(tenantId, entityType, entityId);
      return ResponseHandler.ok(c, result);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })
  // Request upload URL (presigned PUT)
  .post("/upload-request", zValidator("json", uploadRequestSchema), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const input = c.req.valid("json");

    try {
      const res = await AttachmentService.requestUploadUrl(tenantId, user.userId, input);
      return ResponseHandler.success(c, res);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })
  // Stage a multipart upload — API streams the file to MinIO (no browser→MinIO CORS)
  // and returns the storage key. No DB row yet; link it later via /confirm.
  .post("/stage", async (c) => {
    const tenantId = c.get("tenantId");
    try {
      const form = await c.req.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") return ResponseHandler.badRequest(c, "file is required");
      if (file.size > 50 * 1024 * 1024) return ResponseHandler.badRequest(c, "File exceeds 50MB limit");

      const buffer = Buffer.from(await file.arrayBuffer());
      const res = await AttachmentService.stageUpload(tenantId, {
        buffer,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
      return ResponseHandler.success(c, res);
    } catch (err: any) {
      console.error("Attachment stage failed:", err);
      // MinIO connection failures surface as an AggregateError with an empty
      // message — give a clear reason instead of a blank one.
      const codes = [err?.code, ...((err?.errors ?? []).map((e: any) => e?.code))];
      const unreachable = codes.some((x) => x === "ECONNREFUSED" || x === "ENOTFOUND" || x === "ETIMEDOUT");
      const message = unreachable
        ? "Storage service is unavailable"
        : err?.message || err?.code || "Upload failed";
      return ResponseHandler.badRequest(c, message);
    }
  })
  // Confirm upload — links a staged/uploaded object to an entity (creates the row)
  .post("/confirm", zValidator("json", confirmSchema), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const body = c.req.valid("json");

    try {
      const attachment = await AttachmentService.confirmUpload(
        tenantId,
        user.userId,
        { storageKey: body.storageKey },
        {
          entityType: body.entityType,
          entityId: body.entityId,
          filename: body.filename,
          mimeType: body.mimeType,
          sizeBytes: body.sizeBytes,
        },
      );
      return ResponseHandler.success(c, attachment);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })
  // Download — returns a presigned GET URL as JSON. The browser can't send the
  // Bearer token on a raw navigation, so we can't redirect here; the SPA fetches
  // this (with auth) and then opens the presigned URL (signature in query, no
  // auth/CORS needed).
  .get("/:id/download", async (c) => {
    const tenantId = c.get("tenantId");
    const id = c.req.param("id");

    try {
      const downloadUrl = await AttachmentService.getDownloadUrl(tenantId, id);
      return ResponseHandler.success(c, { url: downloadUrl });
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })
  // Delete — removes the DB row, the MinIO object, and writes an audit log.
  .delete("/:id", requirePermission("attachment.delete"), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;

    try {
      const result = await AttachmentService.delete(tenantId, id, user.userId);
      return ResponseHandler.ok(c, result);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  });
