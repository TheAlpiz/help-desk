import { eq, and, desc } from "drizzle-orm";
import { withTenantTransaction } from "../../infra/db/index";
import { ticketFilterRule } from "./ticket-filter.schema";
import type { CreateTicketFilterInput, UpdateTicketFilterInput } from "@help-desk/shared";

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "");
}

/**
 * Returns true if the given (email, subject) matches an active filter rule.
 * Evaluated for every inbound ticket; a match means "drop, never create".
 */
function matchesRule(
  rule: { field: string; value: string },
  ctx: { email?: string | null; subject?: string | null },
): boolean {
  const value = rule.value.trim().toLowerCase();
  const email = (ctx.email ?? "").trim().toLowerCase();
  const subject = (ctx.subject ?? "").trim().toLowerCase();
  switch (rule.field) {
    case "sender_email":
      return !!email && email === value;
    case "sender_domain":
      return !!email && email.split("@")[1] === normalizeDomain(rule.value);
    case "subject_contains":
      return !!subject && subject.includes(value);
    default:
      return false;
  }
}

export const TicketFilterService = {
  list: async (tenantId: string) =>
    withTenantTransaction(tenantId, async (tx) =>
      tx
        .select()
        .from(ticketFilterRule)
        .where(eq(ticketFilterRule.organizationId, tenantId))
        .orderBy(desc(ticketFilterRule.createdAt)),
    ),

  create: async (tenantId: string, input: CreateTicketFilterInput) =>
    withTenantTransaction(tenantId, async (tx) => {
      const rows = await tx
        .insert(ticketFilterRule)
        .values({
          organizationId: tenantId,
          name: input.name,
          field: input.field,
          value: input.value,
          action: input.action ?? "drop",
          isActive: input.isActive ?? true,
        })
        .returning();
      return rows[0];
    }),

  update: async (tenantId: string, id: string, input: UpdateTicketFilterInput) =>
    withTenantTransaction(tenantId, async (tx) => {
      const rows = await tx
        .update(ticketFilterRule)
        .set(input)
        .where(and(eq(ticketFilterRule.id, id), eq(ticketFilterRule.organizationId, tenantId)))
        .returning();
      return rows[0];
    }),

  remove: async (tenantId: string, id: string) =>
    withTenantTransaction(tenantId, async (tx) => {
      await tx
        .delete(ticketFilterRule)
        .where(and(eq(ticketFilterRule.id, id), eq(ticketFilterRule.organizationId, tenantId)));
    }),

  /**
   * Evaluate inbound ticket context against active rules. Returns the first
   * matching rule (caller drops the ticket) or null. Safe to call on any channel.
   */
  evaluate: async (
    tenantId: string,
    ctx: { email?: string | null; subject?: string | null },
  ): Promise<{ id: string; name: string; action: string } | null> => {
    const rules = await withTenantTransaction(tenantId, async (tx) =>
      tx
        .select()
        .from(ticketFilterRule)
        .where(and(eq(ticketFilterRule.organizationId, tenantId), eq(ticketFilterRule.isActive, true))),
    );
    const hit = rules.find((r) => matchesRule(r, ctx));
    return hit ? { id: hit.id, name: hit.name, action: hit.action } : null;
  },
};
