import { ImapFlow } from "imapflow";
import { simpleParser, ParsedMail } from "mailparser";
import sanitizeHtml from "sanitize-html";
import { TicketService } from "../modules/ticket/ticket.service";
import { StorageService } from "../services/storage.service";
import { withTenantTransaction, withSuperAdminTransaction } from "../infra/db";
import { contact } from "../modules/contact/contact.schema";
import { mailbox as mailboxTable } from "../modules/mailbox/mailbox.schema";
import { ticketMessage } from "../modules/ticket/ticket-message.schema";
import { eq, and } from "drizzle-orm";

export class EmailIngestionWorker {
  private client: ImapFlow;
  private organizationId: string;
  private mailboxId: string;

  private disconnectHandler?: () => void;

  constructor(
    private imapConfig: { host: string; port: number; secure: boolean; auth: { user: string; pass: string } },
    organizationId: string,
    mailboxId: string
  ) {
    this.organizationId = organizationId;
    this.mailboxId = mailboxId;
    this.client = new ImapFlow({
      host: imapConfig.host,
      port: imapConfig.port,
      secure: imapConfig.secure,
      auth: imapConfig.auth,
      logger: false,
    });

    this.client.on("error", (err) => {
      console.error(`ImapFlow error for ${this.mailboxId}:`, err);
      if (this.disconnectHandler) this.disconnectHandler();
    });

    this.client.on("close", () => {
      console.warn(`ImapFlow connection closed for ${this.mailboxId}`);
      if (this.disconnectHandler) this.disconnectHandler();
    });
  }

  public onDisconnect(handler: () => void) {
    this.disconnectHandler = handler;
  }

  public async start() {
    await this.client.connect();
    await this.client.mailboxOpen("INBOX");

    this.client.on("exists", (data) => {
      console.log(`New email received in mailbox ${this.mailboxId}. Total: ${data.count}`);
      this.fetchNewEmails();
    });

    await this.fetchNewEmails();
  }

  private async fetchNewEmails() {
    let processed = 0;
    try {
      // Buffer all messages first — cannot issue other IMAP commands
      // (messageFlagsAdd) while the fetch iterator is still open.
      const buffered: { uid: number; source: Buffer }[] = [];
      for await (const message of this.client.fetch({ seen: false }, { source: true, uid: true })) {
        if (message.source) {
          buffered.push({ uid: message.uid, source: message.source });
        }
      }

      for (const message of buffered) {
        const parsed = await simpleParser(message.source);
        await this.processEmail(parsed);
        await this.client.messageFlagsAdd({ uid: message.uid }, ["\\Seen"], { uid: true });
        processed++;
      }
    } catch (err) {
      console.error(`Error fetching emails for mailbox ${this.mailboxId}:`, err);
    }

    if (processed > 0) {
      await withSuperAdminTransaction(async (tx) =>
        tx
          .update(mailboxTable)
          .set({ lastSyncAt: new Date() })
          .where(eq(mailboxTable.id, this.mailboxId))
      ).catch((err) =>
        console.error(`EmailIngestionWorker: Failed to update lastSyncAt for ${this.mailboxId}:`, err)
      );
      console.log(`EmailIngestionWorker: Processed ${processed} email(s) for mailbox ${this.mailboxId}`);
    }
  }

  private async resolveOrCreateContact(senderEmail: string, senderName: string): Promise<string> {
    const existing = await withTenantTransaction(this.organizationId, async (tx) =>
      tx
        .select({ id: contact.id })
        .from(contact)
        .where(and(eq(contact.email, senderEmail), eq(contact.organizationId, this.organizationId)))
        .limit(1)
    );

    if (existing.length > 0) {
      return existing[0].id;
    }

    const nameParts = senderName.trim().split(" ");
    const firstName = nameParts[0] || "Unknown";
    const lastName = nameParts.slice(1).join(" ") || "";

    const created = await withTenantTransaction(this.organizationId, async (tx) =>
      tx
        .insert(contact)
        .values({ organizationId: this.organizationId, email: senderEmail, firstName, lastName })
        .returning({ id: contact.id })
    );

    console.log(`EmailIngestionWorker: Created contact ${senderEmail} (${created[0].id})`);
    return created[0].id;
  }

  private async processEmail(parsed: ParsedMail) {
    // Auto-responder loop protection
    const autoSubmitted = parsed.headers.get("auto-submitted") as string | undefined;
    const xAutoreply = parsed.headers.get("x-autoreply") as string | undefined;
    if ((autoSubmitted && autoSubmitted !== "no") || xAutoreply) {
      console.log("EmailIngestionWorker: Ignored auto-responder email.");
      return;
    }

    const safeHtml = parsed.html
      ? sanitizeHtml(parsed.html, {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
          allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ["src", "alt"] },
        })
      : "";
    const content = safeHtml || parsed.text || "No Content";

    const senderEmail = parsed.from?.value[0]?.address || "unknown@unknown.com";
    const senderName = parsed.from?.value[0]?.name || senderEmail;
    const subject = parsed.subject || "No Subject";

    let contactId: string;
    try {
      contactId = await this.resolveOrCreateContact(senderEmail, senderName);
    } catch (err) {
      console.error(`EmailIngestionWorker: Failed to resolve contact ${senderEmail}:`, err);
      return;
    }

    // Threading: RFC headers first, subject fallback second
    const inReplyTo = parsed.inReplyTo;
    let targetTicketId: string | null = null;

    if (inReplyTo) {
      const existing = await withTenantTransaction(this.organizationId, async (tx) =>
        tx
          .select({ ticketId: ticketMessage.ticketId })
          .from(ticketMessage)
          .where(eq((ticketMessage as any).emailMessageId, inReplyTo))
          .limit(1)
      ).catch(() => []);
      if (existing.length > 0) targetTicketId = existing[0].ticketId;
    }

    if (!targetTicketId) {
      const match = subject.match(/\[TICKET-([a-f0-9-]+)\]/i);
      if (match?.[1]) targetTicketId = match[1];
    }

    // Save attachments
    const attachmentUrls: string[] = [];
    for (const attachment of parsed.attachments) {
      try {
        const url = await StorageService.saveAttachment(
          attachment.filename || "attachment",
          attachment.content
        );
        attachmentUrls.push(url);
      } catch (err) {
        console.error("EmailIngestionWorker: Failed to save attachment:", err);
      }
    }

    const fullContent =
      content + (attachmentUrls.length > 0 ? `\n\nAttachments: ${attachmentUrls.join(", ")}` : "");

    const emailMessageId = parsed.messageId ?? undefined;

    if (targetTicketId) {
      try {
        const replyInput = { content: fullContent, type: "PUBLIC_REPLY" as const, emailMessageId, contactId };
        await TicketService.addMessage(this.organizationId, targetTicketId, null, replyInput);
        console.log(`EmailIngestionWorker: Added reply to ticket ${targetTicketId}`);
      } catch (err) {
        console.error(`EmailIngestionWorker: Failed to add message to ticket ${targetTicketId}:`, err);
      }
    } else {
      try {
        const ticketInput = {
          subject,
          initialMessage: fullContent,
          priority: "medium" as const,
          mailboxId: this.mailboxId,
          emailMessageId,
        };
        const created = await TicketService.createTicketFromEmail(this.organizationId, contactId, ticketInput);
        console.log(`EmailIngestionWorker: Created ticket ${created.id} from email "${subject}"`);
      } catch (err) {
        console.error("EmailIngestionWorker: Failed to create ticket from email:", err);
      }
    }
  }

  public async stop() {
    await this.client.logout();
  }
}
