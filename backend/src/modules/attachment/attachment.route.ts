import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { AttachmentService } from "./attachment.service";
import { uploadRequestSchema, confirmUploadSchema } from "@help-desk/shared";

export const attachmentRouter = new Hono<{ Variables: { tenantId: string; user: JwtPayload } }>();

attachmentRouter.use("*", authMiddleware());

// List attachments for an entity
attachmentRouter.get("/", async (c) => {
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
});

// Request upload URL (presigned PUT)
attachmentRouter.post("/upload-request", zValidator("json", uploadRequestSchema), async (c) => {
  const tenantId = c.get("tenantId");
  const user = c.get("user");
  const input = c.req.valid("json");

  try {
    const res = await AttachmentService.requestUploadUrl(tenantId, user.userId, input);
    return ResponseHandler.success(c, res);
  } catch (err: any) {
    return ResponseHandler.badRequest(c, err.message);
  }
});

// Confirm upload after client PUT to presigned URL
const confirmSchema = confirmUploadSchema.extend({
  entityType: z.string(),
  entityId: z.string().uuid(),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
});

attachmentRouter.post("/confirm", zValidator("json", confirmSchema), async (c) => {
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
});

// Download (redirect to presigned GET)
attachmentRouter.get("/:id/download", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");

  try {
    const downloadUrl = await AttachmentService.getDownloadUrl(tenantId, id);
    return c.redirect(downloadUrl);
  } catch (err: any) {
    return ResponseHandler.badRequest(c, err.message);
  }
});
