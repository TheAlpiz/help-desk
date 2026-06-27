import { eq, and, isNull, count } from "drizzle-orm";
import { withTenantTransaction, withSuperAdminTransaction } from "../../infra/db";
import { slaEscalationRule, SlaEscalationActionDef } from "./sla-escalation-rule.schema";
import { ticket } from "../ticket/ticket.schema";
import { ticketTag } from "../ticket/ticket-tag.schema";
import { user } from "../user/user.schema";
import { auditLog, SYSTEM_ACTOR_ID } from "../audit-log/audit-log.schema";
import { TicketService } from "../ticket/ticket.service";
import { CHANNEL_QUEUE } from "../notification/notification.constants";
import { Queue } from "bullmq";
import { env } from "../../infra/env";
import { logger } from "../../infra/logger";

const inAppQueue = new Queue(CHANNEL_QUEUE.IN_APP, {
  connection: {
    host: env.REDIS_HOST,
    port: parseInt(env.REDIS_PORT),
    password: env.REDIS_PASSWORD || undefined,
  },
});

export const SlaEscalationRuleService = {
  findAll: async (tenantId: string) =>
    withTenantTransaction(tenantId, async (tx) =>
      tx
        .select()
        .from(slaEscalationRule)
        .where(and(eq(slaEscalationRule.organizationId, tenantId), isNull(slaEscalationRule.deletedAt))),
    ),

  findById: async (tenantId: string, id: string) =>
    withTenantTransaction(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(slaEscalationRule)
        .where(and(eq(slaEscalationRule.id, id), eq(slaEscalationRule.organizationId, tenantId)))
        .limit(1);
      return row ?? null;
    }),

  create: async (
    tenantId: string,
    actorId: string,
    data: {
      name: string;
      condition: string;
      thresholdMinutes?: number;
      actions: SlaEscalationActionDef[];
      isActive?: boolean;
    },
  ) =>
    withTenantTransaction(tenantId, async (tx) => {
      const [row] = await tx
        .insert(slaEscalationRule)
        .values({
          organizationId: tenantId,
          createdById: actorId,
          name: data.name,
          condition: data.condition,
          thresholdMinutes: data.thresholdMinutes ?? null,
          actions: data.actions,
          isActive: data.isActive ?? true,
        })
        .returning();
      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "sla_escalation_rule",
        entityId: row.id,
        actorId,
        action: "sla_escalation_rule_created",
        newValues: { name: data.name, condition: data.condition },
      });
      return row;
    }),

  update: async (
    tenantId: string,
    id: string,
    actorId: string,
    data: Partial<{
      name: string;
      condition: string;
      thresholdMinutes: number | null;
      actions: SlaEscalationActionDef[];
      isActive: boolean;
    }>,
  ) =>
    withTenantTransaction(tenantId, async (tx) => {
      const [existing] = await tx
        .select()
        .from(slaEscalationRule)
        .where(and(eq(slaEscalationRule.id, id), eq(slaEscalationRule.organizationId, tenantId)))
        .limit(1);
      if (!existing) throw new Error("Escalation rule not found");
      const [row] = await tx
        .update(slaEscalationRule)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(slaEscalationRule.id, id))
        .returning();
      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "sla_escalation_rule",
        entityId: id,
        actorId,
        action: "sla_escalation_rule_updated",
        oldValues: { isActive: existing.isActive },
        newValues: data,
      });
      return row;
    }),

  remove: async (tenantId: string, id: string, actorId: string) =>
    withTenantTransaction(tenantId, async (tx) => {
      const [existing] = await tx
        .select()
        .from(slaEscalationRule)
        .where(and(eq(slaEscalationRule.id, id), eq(slaEscalationRule.organizationId, tenantId)))
        .limit(1);
      if (!existing) throw new Error("Escalation rule not found");
      await tx.update(slaEscalationRule).set({ deletedAt: new Date() }).where(eq(slaEscalationRule.id, id));
      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "sla_escalation_rule",
        entityId: id,
        actorId,
        action: "sla_escalation_rule_deleted",
        oldValues: { name: existing.name },
      });
    }),

  toggle: async (tenantId: string, id: string, actorId: string) =>
    withTenantTransaction(tenantId, async (tx) => {
      const [existing] = await tx
        .select()
        .from(slaEscalationRule)
        .where(and(eq(slaEscalationRule.id, id), eq(slaEscalationRule.organizationId, tenantId)))
        .limit(1);
      if (!existing) throw new Error("Escalation rule not found");
      const [row] = await tx
        .update(slaEscalationRule)
        .set({ isActive: !existing.isActive, updatedAt: new Date() })
        .where(eq(slaEscalationRule.id, id))
        .returning();
      return row;
    }),

  runForEvent: async (
    tenantId: string,
    condition: string,
    ticketId: string,
    meta?: { breachType?: string },
  ) => {
    const rules = await withSuperAdminTransaction(async (tx) =>
      tx
        .select()
        .from(slaEscalationRule)
        .where(
          and(
            eq(slaEscalationRule.organizationId, tenantId),
            eq(slaEscalationRule.condition, condition),
            eq(slaEscalationRule.isActive, true),
            isNull(slaEscalationRule.deletedAt),
          ),
        ),
    );

    if (rules.length === 0) return;

    const [t] = await withSuperAdminTransaction(async (tx) =>
      tx.select().from(ticket).where(eq(ticket.id, ticketId)).limit(1),
    );
    if (!t) return;

    for (const rule of rules) {
      try {
        const actions = rule.actions as SlaEscalationActionDef[];
        for (const action of actions) {
          await executeAction(action, t, tenantId, rule.name, meta);
        }
        await withSuperAdminTransaction(async (tx) => {
          await tx
            .update(slaEscalationRule)
            .set({ runCount: (rule.runCount ?? 0) + 1 })
            .where(eq(slaEscalationRule.id, rule.id));
          await tx.insert(auditLog).values({
            organizationId: tenantId,
            entityType: "ticket",
            entityId: ticketId,
            actorId: SYSTEM_ACTOR_ID,
            action: "sla_escalation_fired",
            newValues: { ruleId: rule.id, ruleName: rule.name, condition },
          });
        });
      } catch (err) {
        logger.warn({ err, ruleId: rule.id, ticketId }, "SLA escalation rule failed");
      }
    }
  },

  countTicketBreaches: async (ticketId: string) => {
    const rows = await withSuperAdminTransaction(async (tx) =>
      tx
        .select({ n: count() })
        .from(auditLog)
        .where(and(eq(auditLog.entityId, ticketId), eq(auditLog.action, "sla_breached"))),
    );
    return Number(rows[0]?.n ?? 0);
  },
};

async function executeAction(
  action: SlaEscalationActionDef,
  t: any,
  tenantId: string,
  ruleName: string,
  meta?: { breachType?: string },
) {
  const title = `SLA escalation: ${ruleName}`;
  const body = meta?.breachType
    ? `Ticket ${t.subject} — ${meta.breachType.toLowerCase().replace("_", " ")} breach`
    : `Ticket ${t.subject}`;

  switch (action.type) {
    case "notify_agent": {
      if (!t.assigneeId) return;
      await inAppQueue.add("notify", {
        userId: t.assigneeId,
        organizationId: tenantId,
        type: "sla_escalation",
        title,
        body,
        actionUrl: `/tickets/${t.id}`,
      });
      return;
    }
    case "notify_manager": {
      let managerIds: string[] = [];
      if (action.value) {
        managerIds = [action.value];
      } else {
        const admins = await withSuperAdminTransaction(async (tx) =>
          tx
            .select({ id: user.id })
            .from(user)
            .where(and(eq(user.organizationId, tenantId), eq(user.globalRole, "ADMIN"))),
        );
        managerIds = admins.map((a) => a.id);
      }
      for (const uid of managerIds) {
        await inAppQueue.add("notify", {
          userId: uid,
          organizationId: tenantId,
          type: "sla_escalation",
          title,
          body,
          actionUrl: `/tickets/${t.id}`,
        });
      }
      return;
    }
    case "reassign": {
      let targetId = action.value;
      if (!targetId) {
        const candidates = await withSuperAdminTransaction(async (tx) =>
          tx
            .select({ id: user.id })
            .from(user)
            .where(
              and(
                eq(user.organizationId, tenantId),
                eq(user.globalRole, "AGENT"),
              ),
            )
            .limit(1),
        );
        targetId = candidates[0]?.id ?? "";
      }
      if (!targetId) return;
      await TicketService.assignTicket(tenantId, t.id, SYSTEM_ACTOR_ID, targetId);
      return;
    }
    case "add_tag": {
      const tagName = action.value || "escalated";
      await withSuperAdminTransaction(async (tx) =>
        tx.insert(ticketTag).values({ ticketId: t.id, name: tagName }).onConflictDoNothing(),
      );
      return;
    }
    case "increase_priority": {
      const order = ["low", "medium", "high", "critical"];
      const cur = (t.priority ?? "medium").toLowerCase();
      const next = order[Math.min(order.indexOf(cur) + 1, order.length - 1)];
      if (next !== cur) {
        await TicketService.updatePriority(tenantId, t.id, SYSTEM_ACTOR_ID, next as any);
      }
      return;
    }
  }
}
