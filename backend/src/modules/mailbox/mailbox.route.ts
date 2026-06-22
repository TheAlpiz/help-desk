import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { MailboxService, omitCredentials } from "./mailbox.service";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { createMailboxSchema, updateMailboxSchema } from "@help-desk/shared";
import { decryptSecret } from "../../infra/crypto";

const router = new Hono<{ Variables: { tenantId: string; user: JwtPayload } }>()
  .use("*", authMiddleware())

  .get("/", requirePermission("mailbox.manage"), async (c) => {
    const tenantId = c.get("tenantId");
    try {
      const rows = await MailboxService.findAll(tenantId);
      return ResponseHandler.ok(c, rows.map(omitCredentials));
    } catch (err: any) {
      return ResponseHandler.internalServerError(c, err.message);
    }
  })

  .get("/:id", requirePermission("mailbox.manage"), async (c) => {
    const tenantId = c.get("tenantId");
    const id = c.req.param("id") as string;
    try {
      const data = await MailboxService.findById(tenantId, id);
      if (!data) return ResponseHandler.notFound(c);
      return ResponseHandler.ok(c, omitCredentials(data));
    } catch (err: any) {
      return ResponseHandler.internalServerError(c, err.message);
    }
  })

  .post("/", requirePermission("mailbox.manage"), zValidator("json", createMailboxSchema), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    try {
      const body = c.req.valid("json");
      const data = await MailboxService.create(tenantId, user.userId, body);
      return ResponseHandler.created(c, omitCredentials(data));
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .put("/:id", requirePermission("mailbox.manage"), zValidator("json", updateMailboxSchema), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    try {
      const body = c.req.valid("json");
      const data = await MailboxService.update(tenantId, id, user.userId, body);
      return ResponseHandler.ok(c, omitCredentials(data));
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .delete("/:id", requirePermission("mailbox.manage"), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    try {
      await MailboxService.remove(tenantId, id, user.userId);
      return ResponseHandler.ok(c, null);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .post("/:id/test", requirePermission("mailbox.manage"), async (c) => {
    const tenantId = c.get("tenantId");
    const id = c.req.param("id") as string;
    try {
      const mailbox = await MailboxService.findById(tenantId, id);
      if (!mailbox) return ResponseHandler.notFound(c, "Mailbox not found");

      const { ImapFlow } = await import("imapflow");
      const client = new ImapFlow({
        host: mailbox.imapHost!,
        port: mailbox.imapPort ?? 993,
        secure: (mailbox.imapPort ?? 993) !== 143,
        auth: { user: mailbox.imapUser ?? mailbox.emailAddress, pass: decryptSecret(mailbox.imapPasswordEncrypted) ?? "" },
        logger: false,
      });

      try {
        await client.connect();
        await client.logout();
        return ResponseHandler.ok(c, { success: true, message: "IMAP connection successful" });
      } catch (connErr: any) {
        return ResponseHandler.ok(c, { success: false, message: connErr.message });
      }
    } catch (err: any) {
      return ResponseHandler.internalServerError(c, err.message);
    }
  });

export default router;
