import { eq } from "drizzle-orm";
import { db } from "../../infra/db";
import { ticket } from "../ticket/ticket.schema";
import { contact } from "../contact/contact.schema";
import { user } from "../user/user.schema";
import { organization } from "../organization/organization.schema";
import { mailbox } from "../mailbox/mailbox.schema";
import { env } from "../../infra/env";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Resolves all {{variable}} values for a given ticket context.
 * Must be called inside an existing withSuperAdminTransaction.
 */
export async function buildVariableMap(
  tx: Tx,
  ticketId: string,
  mailboxId: string,
  senderId?: string | null,
): Promise<Record<string, string>> {
  const [ticketRow] = await tx
    .select()
    .from(ticket)
    .where(eq(ticket.id, ticketId))
    .limit(1);

  if (!ticketRow) return {};

  const [[orgRow], [mailboxRow]] = await Promise.all([
    tx.select().from(organization).where(eq(organization.id, ticketRow.organizationId)).limit(1),
    tx.select().from(mailbox).where(eq(mailbox.id, mailboxId)).limit(1),
  ]);

  const contactRow = ticketRow.contactId
    ? (await tx.select().from(contact).where(eq(contact.id, ticketRow.contactId)).limit(1))[0] ?? null
    : null;

  // Prefer explicit sender (the replying agent) over ticket assignee
  const agentId = senderId ?? ticketRow.assigneeId;
  const agentRow = agentId
    ? (await tx.select().from(user).where(eq(user.id, agentId)).limit(1))[0] ?? null
    : null;

  const now = new Date();
  const base = env.APP_BASE_URL;
  const orgBranding = (orgRow?.branding ?? {}) as Record<string, string>;

  const customerName = contactRow
    ? [contactRow.firstName, contactRow.lastName].filter(Boolean).join(" ") || contactRow.email
    : "";

  const agentName = agentRow
    ? [agentRow.firstName, agentRow.lastName].filter(Boolean).join(" ") || agentRow.email
    : "";

  return {
    // ── Ticket ────────────────────────────────────────────────────────────
    ticket_id: ticketRow.id,
    ticket_number: ticketRow.id.slice(0, 8).toUpperCase(),
    ticket_subject: ticketRow.subject ?? "",
    ticket_status: ticketRow.status ?? "",
    ticket_priority: ticketRow.priority ?? "",
    ticket_source: ticketRow.source ?? "",
    ticket_url: `${base}/tickets/${ticketRow.id}`,
    ticket_thread_url: `${base}/tickets/${ticketRow.id}#thread`,
    ticket_created_at: ticketRow.createdAt?.toLocaleDateString() ?? "",
    ticket_updated_at: ticketRow.updatedAt?.toLocaleDateString() ?? "",
    ticket_resolved_at: ticketRow.resolvedAt?.toLocaleDateString() ?? "",

    // ── Customer / Contact ────────────────────────────────────────────────
    customer_name: customerName,
    customer_first_name: contactRow?.firstName ?? "",
    customer_last_name: contactRow?.lastName ?? "",
    customer_email: contactRow?.email ?? "",

    // ── Agent ─────────────────────────────────────────────────────────────
    agent_name: agentName,
    agent_first_name: agentRow?.firstName ?? "",
    agent_last_name: agentRow?.lastName ?? "",
    agent_email: agentRow?.email ?? "",
    agent_role: agentRow?.globalRole ?? "",

    // ── Organization ──────────────────────────────────────────────────────
    organization_name: orgRow?.name ?? "",
    organization_email: mailboxRow?.emailAddress ?? "",
    organization_website: orgBranding.website ?? (orgRow?.domain ? `https://${orgRow.domain}` : ""),
    organization_support_url: `${base}/portal`,
    organization_portal_url: base,
    organization_logo_url: orgBranding.logoUrl ?? "",

    // ── System ────────────────────────────────────────────────────────────
    current_date: now.toLocaleDateString(),
    current_time: now.toLocaleTimeString(),
    current_datetime: now.toLocaleString(),
    current_year: String(now.getFullYear()),
    platform_name: "Alpis Help Desk",
    portal_url: base,
  };
}

/**
 * Replaces {{variable}} tokens in a string.
 * Unknown variables are left as-is so they surface rather than silently disappear.
 */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match,
  );
}
