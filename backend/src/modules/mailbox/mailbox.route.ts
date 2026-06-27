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

      // --- IMAP (incoming) ---
      if (!mailbox.imapHost) {
        return ResponseHandler.ok(c, { success: false, message: "IMAP host is not configured" });
      }

      const { ImapFlow } = await import("imapflow");
      const client = new ImapFlow({
        host: mailbox.imapHost,
        port: mailbox.imapPort ?? 993,
        secure: mailbox.imapSecure,
        auth: { user: mailbox.imapUser ?? mailbox.emailAddress, pass: decryptSecret(mailbox.imapPasswordEncrypted) ?? "" },
        logger: false,
        tls: { rejectUnauthorized: false },
        // Fail fast instead of hanging on an unreachable/wrong host.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
        // Authenticate, list folders, then log out — no IDLE/compression setup.
        verifyOnly: true,
      });
      // ImapFlow re-emits connection failures as an 'error' event; without a
      // listener Node would crash on an otherwise-handled rejection.
      client.on("error", () => {});

      try {
        await client.connect();
        await client.logout().catch(() => {});
      } catch (connErr: any) {
        return ResponseHandler.ok(c, { success: false, message: `IMAP: ${connErr.message}` });
      }

      // --- SMTP (outgoing) — only when configured ---
      if (mailbox.smtpHost) {
        const nodemailer = (await import("nodemailer")).default;
        const transporter = nodemailer.createTransport({
          host: mailbox.smtpHost,
          port: mailbox.smtpPort ?? 587,
          secure: mailbox.smtpSecure,
          auth: { user: mailbox.smtpUser ?? mailbox.emailAddress, pass: decryptSecret(mailbox.smtpPasswordEncrypted) ?? "" },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
        });
        try {
          await transporter.verify();
        } catch (smtpErr: any) {
          return ResponseHandler.ok(c, { success: false, message: `SMTP: ${smtpErr.message}` });
        }
      }

      return ResponseHandler.ok(c, { success: true, message: "Connection successful" });
    } catch (err: any) {
      return ResponseHandler.internalServerError(c, err.message);
    }
  });

export default router;
