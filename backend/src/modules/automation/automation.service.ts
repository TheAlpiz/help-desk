import { eq, and, isNull } from "drizzle-orm";
import { withTenantTransaction } from "../../infra/db";
import { automation, AutomationCondition, AutomationActionDef } from "./automation.schema";
import { ticket } from "../ticket/ticket.schema";
import { ticketTag } from "../ticket/ticket-tag.schema";
import { ticketMessage } from "../ticket/ticket-message.schema";
import { task } from "../task/task.schema";
import { auditLog } from "../audit-log/audit-log.schema";
import { user } from "../user/user.schema";
import { department } from "../department/department.schema";
import { logger } from "../../infra/logger";

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
    return withTenantTransaction(tenantId, async (tx) => {
      const rules = await tx.select().from(automation)
        .where(and(eq(automation.organizationId, tenantId), eq(automation.trigger, triggerType), eq(automation.isActive, true), isNull(automation.deletedAt)));

      const [t] = await tx.select().from(ticket).where(eq(ticket.id, ticketId)).limit(1);
      if (!t) return;

      for (const rule of rules) {
        const conditions = rule.conditions as AutomationCondition[];
        const match = rule.conditionMatch === "any"
          ? conditions.length === 0 || conditions.some((c) => evaluateCondition(c, t))
          : conditions.every((c) => evaluateCondition(c, t));

        if (!match) continue;

        const actions = rule.actions as AutomationActionDef[];
        for (const action of actions) {
          try {
            switch (action.type) {
              case "set_status":
                if (action.value) await tx.update(ticket).set({ status: action.value.toLowerCase() }).where(eq(ticket.id, ticketId));
                break;
              case "set_priority":
                if (action.value) await tx.update(ticket).set({ priority: action.value.toLowerCase() as any }).where(eq(ticket.id, ticketId));
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
                await tx.update(ticket).set({ assigneeId }).where(eq(ticket.id, ticketId));
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
                break;
              }
              case "add_tag":
                if (action.value) await tx.insert(ticketTag).values({ ticketId, name: action.value }).onConflictDoNothing();
                break;
              case "remove_tag":
                if (action.value) await tx.delete(ticketTag).where(and(eq(ticketTag.ticketId, ticketId), eq(ticketTag.name, action.value)));
                break;
              case "add_note":
                if (action.value) await tx.insert(ticketMessage).values({ ticketId, senderId: actorId ?? undefined, content: action.value, type: "INTERNAL_NOTE" });
                break;
              case "create_task": {
                if (!action.value) break;
                // task.creatorId is NOT NULL → fall back to the rule's author when the
                // triggering event has no actor (e.g. inbound email created the ticket).
                const creatorId = actorId ?? rule.createdById;
                if (!creatorId) { logger.warn({ ruleId: rule.id }, "Automation create_task: no creator available"); break; }
                const [createdTask] = await tx.insert(task).values({
                  organizationId: tenantId,
                  ticketId,
                  creatorId,
                  title: action.value.slice(0, 255),
                  status: "TODO",
                  priority: "MEDIUM",
                }).returning();
                await tx.insert(auditLog).values({ organizationId: tenantId, entityType: "task", entityId: createdTask.id, actorId: actorId ?? "system", action: "created", newValues: { title: createdTask.title, viaAutomation: rule.id } });
                break;
              }
              case "send_email":
                // Email notification is enqueued via notification worker — no-op here for now
                break;
            }
          } catch (actionErr) {
            logger.warn({ actionErr, action, ticketId, ruleId: rule.id }, "Automation action failed, continuing");
          }
        }

        await tx.update(automation).set({ runCount: (rule.runCount ?? 0) + 1 }).where(eq(automation.id, rule.id));
        await tx.insert(auditLog).values({ organizationId: tenantId, entityType: "ticket", entityId: ticketId, actorId: actorId ?? "system", action: "automation_fired", newValues: { automationId: rule.id, automationName: rule.name } });
      }
    });
  },
};

const FIELD_MAP: Record<string, string> = {
  subject_contains: "subject",
  assignee: "assigneeId",
  department: "departmentId",
};

function evaluateCondition(c: AutomationCondition, t: Record<string, any>): boolean {
  const dbField = FIELD_MAP[c.field] ?? c.field;
  const fieldValue = String(t[dbField] ?? "").toLowerCase();
  const condValue = String(c.value ?? "").toLowerCase();
  switch (c.operator) {
    case "equals": return fieldValue === condValue;
    case "not_equals": return fieldValue !== condValue;
    case "contains": return fieldValue.includes(condValue);
    case "not_contains": return !fieldValue.includes(condValue);
    case "is_empty": return !fieldValue;
    case "is_not_empty": return !!fieldValue;
    default: return true;
  }
}
