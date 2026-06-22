import { eq, and, isNull, inArray, desc } from "drizzle-orm";
import { withTenantTransaction } from "../../infra/db";
import { automation, AutomationCondition, AutomationActionDef } from "./automation.schema";
import { ticket } from "../ticket/ticket.schema";
import { ticketTag } from "../ticket/ticket-tag.schema";
import { ticketMessage } from "../ticket/ticket-message.schema";
import { task } from "../task/task.schema";
import { auditLog } from "../audit-log/audit-log.schema";
import { user } from "../user/user.schema";
import { contact } from "../contact/contact.schema";
import { attachment } from "../attachment/attachment.schema";
import { department } from "../department/department.schema";
import { organization } from "../organization/organization.schema";
import { logger } from "../../infra/logger";
import { emitEvent } from "../../infra/events";
import { addBusinessDays, BusinessHoursConfig } from "../../lib/business-hours";
import { SlaService } from "../sla/sla.service";
import { NotificationService } from "../notification/notification.service";
import { emailDeliveryQueue } from "../../workers/email-delivery.worker";

// Ordinal rank for priority so greater_than / less_than work numerically.
const PRIORITY_RANK: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

// Crude UUID check — distinguishes a stored id from a human-readable name/email.
const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export const AutomationService = {
  findAll: async (tenantId: string) => {
    return withTenantTransaction(tenantId, async (tx) =>
      tx.select().from(automation).where(and(eq(automation.organizationId, tenantId), isNull(automation.deletedAt))),
    );
  },

  findById: async (tenantId: string, id: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [row] = await tx.select().from(automation).where(and(eq(automation.id, id), eq(automation.organizationId, tenantId))).limit(1);
      return row ?? null;
    });
  },

  create: async (tenantId: string, actorId: string, data: {
    name: string;
    description?: string;
    trigger: string;
    conditions: AutomationCondition[];
    actions: AutomationActionDef[];
    conditionMatch?: "all" | "any";
  }) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [row] = await tx.insert(automation).values({
        organizationId: tenantId,
        createdById: actorId,
        name: data.name,
        description: data.description,
        trigger: data.trigger,
        conditions: data.conditions,
        actions: data.actions,
        conditionMatch: data.conditionMatch ?? "all",
      }).returning();
      await tx.insert(auditLog).values({ organizationId: tenantId, entityType: "automation", entityId: row.id, actorId, action: "automation_created", newValues: { name: data.name } });
      return row;
    });
  },

  update: async (tenantId: string, id: string, actorId: string, data: Partial<{
    name: string;
    description: string;
    trigger: string;
    conditions: AutomationCondition[];
    actions: AutomationActionDef[];
    conditionMatch: string;
    isActive: boolean;
  }>) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [existing] = await tx.select().from(automation).where(and(eq(automation.id, id), eq(automation.organizationId, tenantId))).limit(1);
      if (!existing) throw new Error("Automation not found");
      const [row] = await tx.update(automation).set({ ...data, updatedAt: new Date() }).where(eq(automation.id, id)).returning();
      await tx.insert(auditLog).values({ organizationId: tenantId, entityType: "automation", entityId: id, actorId, action: "automation_updated", oldValues: { isActive: existing.isActive }, newValues: data });
      return row;
    });
  },

  remove: async (tenantId: string, id: string, actorId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [existing] = await tx.select().from(automation).where(and(eq(automation.id, id), eq(automation.organizationId, tenantId))).limit(1);
      if (!existing) throw new Error("Automation not found");
      await tx.update(automation).set({ deletedAt: new Date() }).where(eq(automation.id, id));
      await tx.insert(auditLog).values({ organizationId: tenantId, entityType: "automation", entityId: id, actorId, action: "automation_deleted", oldValues: { name: existing.name } });
    });
  },

  toggle: async (tenantId: string, id: string, actorId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [existing] = await tx.select().from(automation).where(and(eq(automation.id, id), eq(automation.organizationId, tenantId))).limit(1);
      if (!existing) throw new Error("Automation not found");
      const [row] = await tx.update(automation).set({ isActive: !existing.isActive, updatedAt: new Date() }).where(eq(automation.id, id)).returning();
      return row;
    });
  },

  // Called by ticket events (ticket_created, ticket_updated, etc.)
  runForEvent: async (tenantId: string, triggerType: string, ticketId: string, actorId: string | null) => {
    // External side-effects (email, notify, webhook) are collected here and run
    // AFTER the transaction commits — never hold the DB tx open on network I/O.
    const sideEffects: Array<() => Promise<void>> = [];

    await withTenantTransaction(tenantId, async (tx) => {
      // actorId may be a non-UUID sentinel ("EMAIL", "system") for system-originated
      // events. Those must never be written into uuid user-id columns (creator_id,
      // sender_id) — Postgres rejects them with 22P02 and aborts the whole tx.
      const actorUserId = actorId && isUuid(actorId) ? actorId : null;
      const rules = await tx.select().from(automation)
        .where(and(eq(automation.organizationId, tenantId), eq(automation.trigger, triggerType), eq(automation.isActive, true), isNull(automation.deletedAt)));

      logger.info({ triggerType, ticketId, ruleCount: rules.length, ruleIds: rules.map(r => r.id) }, "[Automation] Rules matched for event");

      const [t] = await tx.select().from(ticket).where(eq(ticket.id, ticketId)).limit(1);
      if (!t) return;

      // ── Build the enriched condition-evaluation context once per event ──
      const tags = (await tx.select({ name: ticketTag.name }).from(ticketTag).where(eq(ticketTag.ticketId, ticketId))).map(r => r.name);

      const messages = await tx.select({ id: ticketMessage.id, content: ticketMessage.content })
        .from(ticketMessage).where(eq(ticketMessage.ticketId, ticketId)).orderBy(desc(ticketMessage.createdAt));
      const latestBody = messages[0]?.content ?? "";

      let hasAttachment = false;
      if (messages.length) {
        const [att] = await tx.select({ id: attachment.id }).from(attachment)
          .where(and(eq(attachment.organizationId, tenantId), eq(attachment.entityType, "TICKET_MESSAGE"), inArray(attachment.entityId, messages.map(m => m.id))))
          .limit(1);
        hasAttachment = !!att;
      }

      let requesterEmail = "";
      if (t.contactId) {
        const [c] = await tx.select({ email: contact.email }).from(contact).where(eq(contact.id, t.contactId)).limit(1);
        requesterEmail = c?.email ?? "";
      } else if (t.requesterId) {
        const [u] = await tx.select({ email: user.email }).from(user).where(eq(user.id, t.requesterId)).limit(1);
        requesterEmail = u?.email ?? "";
      }

      // Heuristic: email tickets carry a contact, portal/API tickets carry a requester user.
      const source = t.contactId ? "email" : "portal";
      const ageHours = t.createdAt ? (Date.now() - new Date(t.createdAt).getTime()) / 3_600_000 : 0;

      const ctx: Record<string, any> = {
        status: t.status,
        priority: t.priority,
        subject: t.subject,
        subject_contains: t.subject,
        assignee: t.assigneeId ?? "",
        department: t.departmentId ?? "",
        tag: tags.join(","),
        _tags: tags,
        source,
        requester_email: requesterEmail,
        has_attachment: hasAttachment ? "true" : "false",
        ticket_age_hours: ageHours,
        body: latestBody,
      };

      for (const rule of rules) {
        const conditions = rule.conditions as AutomationCondition[];
        const match = rule.conditionMatch === "any"
          ? conditions.length === 0 || conditions.some((c) => evaluateCondition(c, ctx))
          : conditions.every((c) => evaluateCondition(c, ctx));

        if (!match) continue;

        const actions = rule.actions as AutomationActionDef[];
        logger.info({ ruleId: rule.id, ruleName: rule.name, actionCount: actions.length, actions: actions.map(a => a.type) }, "[Automation] Executing rule");
        
        let slaNeedsReeval = false;
        let updatedPriority: string | undefined;
        let updatedDepartmentId: string | undefined;

        for (const action of actions) {
          try {
            switch (action.type) {
              case "set_status":
                if (action.value) await tx.update(ticket).set({ status: action.value.toLowerCase() }).where(eq(ticket.id, ticketId));
                break;
              case "set_priority":
                if (action.value) {
                  await tx.update(ticket).set({ priority: action.value.toLowerCase() as any }).where(eq(ticket.id, ticketId));
                  slaNeedsReeval = true;
                  updatedPriority = action.value.toLowerCase();
                }
                break;
              case "assign_to": {
                if (!action.value) break;
                // value may be a UUID or an email address
                let assigneeId = action.value;
                if (action.value.includes("@")) {
                  const [found] = await tx.select({ id: user.id }).from(user).where(eq(user.email, action.value)).limit(1);
                  if (!found) { logger.warn({ email: action.value }, "Automation assign_to: user not found"); break; }
                  assigneeId = found.id;
                }
                
                const currentTicket = await tx.select().from(ticket).where(eq(ticket.id, ticketId)).limit(1);
                
                if (currentTicket[0] && currentTicket[0].assigneeId !== assigneeId) {
                  await tx.update(ticket).set({ assigneeId, status: "assigned" }).where(eq(ticket.id, ticketId));
                  emitEvent("ticket.assigned", { ticketId, assigneeId, actorId: "system", organizationId: tenantId });
                  await tx.insert(auditLog).values({ organizationId: tenantId, entityType: "ticket", entityId: ticketId, actorId: "system", action: "assigned", oldValues: { assigneeId: currentTicket[0].assigneeId }, newValues: { assigneeId, viaAutomation: rule.id } });
                }
                
                break;
              }
              case "set_department": {
                if (!action.value) break;
                // value may be a UUID or a department name
                let departmentId = action.value;
                if (!isUuid(action.value)) {
                  const [found] = await tx.select({ id: department.id }).from(department)
                    .where(and(eq(department.organizationId, tenantId), eq(department.name, action.value))).limit(1);
                  if (!found) { logger.warn({ name: action.value }, "Automation set_department: department not found"); break; }
                  departmentId = found.id;
                }
                await tx.update(ticket).set({ departmentId }).where(eq(ticket.id, ticketId));
                slaNeedsReeval = true;
                updatedDepartmentId = departmentId;
                break;
              }
              case "add_tag":
                if (action.value) await tx.insert(ticketTag).values({ ticketId, name: action.value }).onConflictDoNothing();
                break;
              case "remove_tag":
                if (action.value) await tx.delete(ticketTag).where(and(eq(ticketTag.ticketId, ticketId), eq(ticketTag.name, action.value)));
                break;
              case "add_note":
                if (action.value) await tx.insert(ticketMessage).values({ ticketId, senderId: actorUserId ?? undefined, content: action.value, type: "INTERNAL_NOTE" });
                break;
              case "create_task": {
                if (!action.value) break;
                // task.creatorId is NOT NULL → fall back to the rule's author when the
                // triggering event has no (valid) actor, e.g. inbound email created the
                // ticket and actorId is the "EMAIL" sentinel rather than a real user.
                const creatorId = actorUserId ?? rule.createdById;
                if (!creatorId) { logger.warn({ ruleId: rule.id }, "Automation create_task: no creator available"); break; }

                // Deduplicate: skip if an open task with the same title already exists
                // for this ticket (prevents double-creation when multiple SLA breach
                // types fire the same automation, e.g. FIRST_RESPONSE + RESOLUTION).
                const [duplicate] = await tx
                  .select({ id: task.id })
                  .from(task)
                  .where(and(eq(task.ticketId, ticketId), eq(task.title, action.value.slice(0, 255))))
                  .limit(1);
                if (duplicate) {
                  logger.info({ ruleId: rule.id, ticketId, title: action.value }, "Automation create_task: skipped duplicate task");
                  break;
                }

                // Optional assignee — value may be a UUID or an email address.
                let assigneeId: string | null = null;
                if (action.assignee) {
                  if (action.assignee.includes("@")) {
                    const [found] = await tx.select({ id: user.id }).from(user).where(eq(user.email, action.assignee)).limit(1);
                    if (found) assigneeId = found.id;
                    else logger.warn({ email: action.assignee }, "Automation create_task: assignee not found");
                  } else {
                    assigneeId = action.assignee;
                  }
                }

                const priority = action.priority ?? "MEDIUM";
                let dueDate: Date | null = null;
                if (action.dueInDays != null) {
                  const [orgRow] = await tx
                    .select({ businessHoursConfig: organization.businessHoursConfig })
                    .from(organization)
                    .where(eq(organization.id, tenantId))
                    .limit(1);
                  const bh = orgRow?.businessHoursConfig as BusinessHoursConfig | null | undefined;
                  dueDate = bh?.timezone && bh?.days
                    ? addBusinessDays(new Date(), action.dueInDays, bh)
                    : new Date(Date.now() + action.dueInDays * 24 * 60 * 60 * 1000);
                }

                const [createdTask] = await tx.insert(task).values({
                  organizationId: tenantId,
                  ticketId,
                  creatorId,
                  assigneeId,
                  title: action.value.slice(0, 255),
                  status: "TODO",
                  priority,
                  dueDate,
                }).returning();
                await tx.insert(auditLog).values({ organizationId: tenantId, entityType: "task", entityId: createdTask.id, actorId: actorId ?? "system", action: "created", newValues: { title: createdTask.title, assigneeId, priority, dueDate, viaAutomation: rule.id } });
                break;
              }
              case "send_email": {
                if (!action.value) break;
                // Recipient: explicit email in `assignee`, else the ticket requester.
                const to = action.assignee?.includes("@") ? action.assignee : requesterEmail;
                if (!to) { logger.warn({ ruleId: rule.id }, "Automation send_email: no recipient"); break; }
                const emailSubject = (action as any).subject || t.subject;
                const html = action.value;
                sideEffects.push(async () => {
                  await emailDeliveryQueue.add("send-reply", { mailboxId: t.mailboxId, to, subject: emailSubject, html, ticketId });
                });
                break;
              }
              case "notify": {
                // Target user: explicit assignee (email/uuid), else the ticket assignee.
                let targetId: string | null = null;
                if (action.assignee) {
                  if (action.assignee.includes("@")) {
                    const [u] = await tx.select({ id: user.id }).from(user).where(eq(user.email, action.assignee)).limit(1);
                    targetId = u?.id ?? null;
                  } else if (isUuid(action.assignee)) {
                    targetId = action.assignee;
                  }
                }
                targetId = targetId ?? t.assigneeId ?? null;
                if (!targetId) { logger.warn({ ruleId: rule.id }, "Automation notify: no target user"); break; }
                const body = action.value || `Automation "${rule.name}" fired on this ticket`;
                const target = targetId;
                sideEffects.push(async () => {
                  await NotificationService.dispatch("automation.notify", target, tenantId, {
                    title: rule.name,
                    body,
                    actionUrl: `/tickets/${ticketId}`,
                  });
                });
                break;
              }
              case "webhook": {
                const url = action.value;
                if (!url || !/^https?:\/\//i.test(url)) { logger.warn({ ruleId: rule.id, url }, "Automation webhook: invalid URL"); break; }
                const payload = {
                  event: triggerType,
                  ruleId: rule.id,
                  ruleName: rule.name,
                  organizationId: tenantId,
                  firedAt: new Date().toISOString(),
                  ticket: { id: t.id, subject: t.subject, status: t.status, priority: t.priority, assigneeId: t.assigneeId },
                };
                sideEffects.push(async () => {
                  const ctrl = new AbortController();
                  const timer = setTimeout(() => ctrl.abort(), 5000);
                  try {
                    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: ctrl.signal });
                  } finally {
                    clearTimeout(timer);
                  }
                });
                break;
              }
              case "resolve_ticket":
                await tx.update(ticket).set({ status: "resolved", resolvedAt: new Date() }).where(eq(ticket.id, ticketId));
                break;
              case "close_ticket":
                await tx.update(ticket).set({ status: "closed" }).where(eq(ticket.id, ticketId));
                break;
              case "set_due_date": {
                const days = action.dueInDays ?? 1;
                const [orgRow] = await tx.select({ businessHoursConfig: organization.businessHoursConfig })
                  .from(organization).where(eq(organization.id, tenantId)).limit(1);
                const bh = orgRow?.businessHoursConfig as BusinessHoursConfig | null | undefined;
                const due = bh?.timezone && bh?.days
                  ? addBusinessDays(new Date(), days, bh)
                  : new Date(Date.now() + days * 24 * 60 * 60 * 1000);
                await tx.update(ticket).set({ resolutionTargetAt: due }).where(eq(ticket.id, ticketId));
                break;
              }
            }
          } catch (actionErr) {
            logger.warn({ actionErr, action, ticketId, ruleId: rule.id }, "Automation action failed, continuing");
          }
        }

        if (slaNeedsReeval) {
          const [current] = await tx.select().from(ticket).where(eq(ticket.id, ticketId)).limit(1);
          if (current) {
            const finalPriority = updatedPriority ?? current.priority;
            const finalDept = updatedDepartmentId !== undefined ? updatedDepartmentId : current.departmentId;
            await SlaService.attachSlaToTicket(tx, ticketId, tenantId, finalPriority, finalDept || undefined);
          }
        }

        await tx.update(automation).set({ runCount: (rule.runCount ?? 0) + 1 }).where(eq(automation.id, rule.id));
        await tx.insert(auditLog).values({ organizationId: tenantId, entityType: "ticket", entityId: ticketId, actorId: actorId ?? "system", action: "automation_fired", newValues: { automationId: rule.id, automationName: rule.name } });
      }
    });

    // Fire external side-effects after the tx has committed. One failure never
    // blocks the others or rolls back the in-DB changes.
    for (const fx of sideEffects) {
      try { await fx(); } catch (err) { logger.warn({ err }, "Automation side-effect failed"); }
    }
  },
};

function toNumber(field: string, v: any): number {
  if (field === "priority") return PRIORITY_RANK[String(v ?? "").toLowerCase()] ?? 0;
  const n = parseFloat(String(v ?? ""));
  return Number.isNaN(n) ? 0 : n;
}

function safeRegex(pattern: string, value: string): boolean {
  try { return new RegExp(pattern, "i").test(value); } catch { return false; }
}

// `ctx` is keyed by condition-field name (built in runForEvent), so no field map
// is needed — subject_contains/assignee/department are present directly.
function evaluateCondition(c: AutomationCondition, ctx: Record<string, any>): boolean {
  // Tags are a set → membership semantics, not string compare.
  if (c.field === "tag") {
    const tags: string[] = (ctx._tags ?? []).map((s: string) => s.toLowerCase());
    const v = String(c.value ?? "").toLowerCase();
    switch (c.operator) {
      case "not_equals":
      case "not_contains": return !tags.includes(v);
      case "is_empty": return tags.length === 0;
      case "is_not_empty": return tags.length > 0;
      default: return tags.includes(v);
    }
  }

  const raw = ctx[c.field];
  const fieldValue = String(raw ?? "").toLowerCase();
  const condValue = String(c.value ?? "").toLowerCase();
  switch (c.operator) {
    case "equals": return fieldValue === condValue;
    case "not_equals": return fieldValue !== condValue;
    case "contains": return fieldValue.includes(condValue);
    case "not_contains": return !fieldValue.includes(condValue);
    case "starts_with": return fieldValue.startsWith(condValue);
    case "ends_with": return fieldValue.endsWith(condValue);
    case "is_empty": return !fieldValue;
    case "is_not_empty": return !!fieldValue;
    case "greater_than": return toNumber(c.field, raw) > toNumber(c.field, c.value);
    case "less_than": return toNumber(c.field, raw) < toNumber(c.field, c.value);
    case "matches_regex": return safeRegex(c.value, String(raw ?? ""));
    case "not_matches_regex": return !safeRegex(c.value, String(raw ?? ""));
    default: return true;
  }
}
