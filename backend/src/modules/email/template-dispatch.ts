import { and, desc, eq } from "drizzle-orm";
import { withSuperAdminTransaction } from "../../infra/db";
import { ticket } from "../ticket/ticket.schema";
import { contact } from "../contact/contact.schema";
import { user } from "../user/user.schema";
import { emailTemplate, templateVersion } from "./email.schema";
import { emailDeliveryQueue } from "../../workers/email-delivery.worker";
import { logger } from "../../infra/logger";

/**
 * Returns the org's PUBLISHED template (subject + body) for a type, or null. Used
 * to wrap outbound mail (e.g. agent replies) in the configured template — the
 * delivery worker interpolates {{variables}} like {{content}} afterwards.
 */
export async function getPublishedTemplate(
  organizationId: string,
  templateType: string,
): Promise<{ subject: string | null; bodyHtml: string } | null> {
  try {
    return await withSuperAdminTransaction(async (tx) => {
      const [tpl] = await tx
        .select({ id: emailTemplate.id })
        .from(emailTemplate)
        .where(and(eq(emailTemplate.organizationId, organizationId), eq(emailTemplate.templateType, templateType)))
        .limit(1);
      if (!tpl) return null;
      const [ver] = await tx
        .select()
        .from(templateVersion)
        .where(eq(templateVersion.templateId, tpl.id))
        .orderBy(desc(templateVersion.versionNumber))
        .limit(1);
      if (!ver || ver.status !== "PUBLISHED" || !ver.bodyHtml) return null;
      return { subject: ver.subject, bodyHtml: ver.bodyHtml };
    });
  } catch (err) {
    logger.error({ err, templateType }, "Failed to load published template");
    return null;
  }
}

/**
 * Sends an event-driven email to the ticket's customer using the org's configured
 * email template for `templateType` (e.g. "ticket_created", "ticket_closed").
 *
 * No-op (and never throws) when: the ticket/customer can't be resolved, the org
 * has no template of that type, or its latest version isn't PUBLISHED. The
 * delivery worker handles {{variable}} interpolation + signature, so the raw
 * template subject/body are enqueued as-is.
 */
export async function dispatchTicketTemplate(
  organizationId: string,
  ticketId: string,
  templateType: string,
  opts?: { senderId?: string | null; requireStatusIn?: string[] },
): Promise<void> {
  try {
    const job = await withSuperAdminTransaction(async (tx) => {
      const [t] = await tx
        .select({
          mailboxId: ticket.mailboxId,
          contactId: ticket.contactId,
          requesterId: ticket.requesterId,
          subject: ticket.subject,
          status: ticket.status,
        })
        .from(ticket)
        .where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, organizationId)))
        .limit(1);
      if (!t) return null;
      if (opts?.requireStatusIn && !opts.requireStatusIn.includes(t.status)) return null;

      // Recipient: the ticket's contact (email channel), falling back to the
      // portal requester's email. No customer address → nothing to send.
      let to: string | null = null;
      if (t.contactId) {
        const [c] = await tx.select({ email: contact.email }).from(contact).where(eq(contact.id, t.contactId)).limit(1);
        to = c?.email ?? null;
      }
      if (!to && t.requesterId) {
        const [u] = await tx.select({ email: user.email }).from(user).where(eq(user.id, t.requesterId)).limit(1);
        to = u?.email ?? null;
      }
      if (!to) return null;

      const [tpl] = await tx
        .select({ id: emailTemplate.id })
        .from(emailTemplate)
        .where(and(eq(emailTemplate.organizationId, organizationId), eq(emailTemplate.templateType, templateType)))
        .limit(1);
      if (!tpl) return null;

      const [ver] = await tx
        .select()
        .from(templateVersion)
        .where(eq(templateVersion.templateId, tpl.id))
        .orderBy(desc(templateVersion.versionNumber))
        .limit(1);
      // Only published templates go out — drafts stay drafts.
      if (!ver || ver.status !== "PUBLISHED" || !ver.bodyHtml) return null;

      return {
        mailboxId: t.mailboxId,
        to,
        subject: ver.subject || t.subject,
        html: ver.bodyHtml,
        ticketId,
        templateType,
        senderId: opts?.senderId ?? null,
      };
    });

    if (job) await emailDeliveryQueue.add("template-send", job);
  } catch (err) {
    logger.error({ err, ticketId, templateType }, "Failed to dispatch ticket email template");
  }
}
