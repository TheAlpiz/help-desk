import { Worker, Job } from "bullmq";
import { and, eq, gt, isNotNull, isNull, lt, lte, ne } from "drizzle-orm";
import { withSuperAdminTransaction } from "../infra/db";
import { ticket } from "../modules/ticket/ticket.schema";
import { ticketMessage } from "../modules/ticket/ticket-message.schema";
import { slaEscalation } from "../modules/sla/sla-escalation.schema";
import { auditLog } from "../modules/audit-log/audit-log.schema";
import { TicketService } from "../modules/ticket/ticket.service";
import { SlaEscalationRuleService } from "../modules/sla/sla-escalation-rule.service";
import { slaEscalationRule } from "../modules/sla/sla-escalation-rule.schema";

interface SlaJobData {
  ticketId: string;
  policyId: string;
}

export class SlaWorker {
  private worker: Worker;
  private scanTimer: ReturnType<typeof setInterval> | null = null;

  constructor(redisConfig: { host: string; port: number; password?: string }) {
    this.worker = new Worker(
      "sla-engine",
      async (job: Job<SlaJobData>) => {
        await this.processJob(job);
      },
      { connection: redisConfig },
    );

    this.worker.on("failed", (job, err) => {
      console.error(`SLA check job ${job?.id} failed:`, err);
    });

    // Periodic scan for breach_imminent + no_response triggers (runs every 60s).
    this.scanTimer = setInterval(() => {
      this.scanForRules().catch((err) => console.error("SLA rule scan failed:", err));
    }, 60_000);
  }

  private async scanForRules() {
    const now = new Date();

    const rules = await withSuperAdminTransaction(async (tx) =>
      tx
        .select()
        .from(slaEscalationRule)
        .where(and(eq(slaEscalationRule.isActive, true), isNull(slaEscalationRule.deletedAt))),
    );

    for (const rule of rules) {
      const thresholdMs = (rule.thresholdMinutes ?? 30) * 60_000;

      if (rule.condition === "breach_imminent") {
        const horizon = new Date(now.getTime() + thresholdMs);
        const candidates = await withSuperAdminTransaction(async (tx) =>
          tx
            .select({ id: ticket.id, organizationId: ticket.organizationId })
            .from(ticket)
            .where(
              and(
                eq(ticket.organizationId, rule.organizationId),
                isNotNull(ticket.firstResponseTargetAt),
                eq(ticket.firstResponseMet, false),
                lte(ticket.firstResponseTargetAt!, horizon),
                gt(ticket.firstResponseTargetAt!, now),
                ne(ticket.status, "resolved"),
                ne(ticket.status, "closed"),
              ),
            ),
        );

        for (const t of candidates) {
          if (await alreadyFired(rule.id, t.id, "sla_imminent_fired")) continue;
          await SlaEscalationRuleService.runForEvent(t.organizationId, "breach_imminent", t.id);
          await markFired(rule.id, t.id, t.organizationId, "sla_imminent_fired");
        }
      }

      if (rule.condition === "no_response") {
        const cutoff = new Date(now.getTime() - thresholdMs);
        const candidates = await withSuperAdminTransaction(async (tx) =>
          tx
            .select({ id: ticket.id, organizationId: ticket.organizationId })
            .from(ticket)
            .where(
              and(
                eq(ticket.organizationId, rule.organizationId),
                lt(ticket.createdAt, cutoff),
                eq(ticket.firstResponseMet, false),
                ne(ticket.status, "resolved"),
                ne(ticket.status, "closed"),
              ),
            ),
        );

        for (const t of candidates) {
          if (await alreadyFired(rule.id, t.id, "sla_no_response_fired")) continue;
          // Ensure no agent reply (defensive double-check)
          const replies = await withSuperAdminTransaction(async (tx) =>
            tx
              .select({ id: ticketMessage.id })
              .from(ticketMessage)
              .where(and(eq(ticketMessage.ticketId, t.id), isNotNull(ticketMessage.senderId)))
              .limit(1),
          );
          if (replies.length > 0) continue;
          await SlaEscalationRuleService.runForEvent(t.organizationId, "no_response", t.id);
          await markFired(rule.id, t.id, t.organizationId, "sla_no_response_fired");
        }
      }
    }
  }

  private async processJob(job: Job<SlaJobData>) {
    const { ticketId, policyId } = job.data;
    const checkType = job.name; // "first_response_check" | "resolution_check"

    // Trusted background job: bypass RLS (tenant is derived from the ticket row).
    const tRes = await withSuperAdminTransaction(async (tx) =>
      tx.select().from(ticket).where(eq(ticket.id, ticketId)).limit(1),
    );
    const t = tRes[0];

    if (!t) return;

    if (checkType === "first_response_check") {
      if (
        t.firstResponseMet ||
        t.status === "resolved" ||
        t.status === "closed"
      ) {
        console.log(`SLA: First Response met for ticket ${ticketId}`);
        return; // SLA Met
      }

      console.log(`SLA BREACH: First Response missed for ticket ${ticketId}`);
      await this.handleBreach(
        ticketId,
        policyId,
        "FIRST_RESPONSE",
        t.organizationId,
      );
    } else if (checkType === "resolution_check") {
      if (t.status === "resolved" || t.status === "closed") {
        console.log(`SLA: Resolution met for ticket ${ticketId}`);
        return; // SLA Met
      }

      console.log(`SLA BREACH: Resolution missed for ticket ${ticketId}`);
      await withSuperAdminTransaction(async (tx) =>
        tx.update(ticket).set({ resolutionBreached: true }).where(eq(ticket.id, ticketId)),
      );
      await this.handleBreach(
        ticketId,
        policyId,
        "RESOLUTION",
        t.organizationId,
      );
    }
  }

  private async handleBreach(
    ticketId: string,
    policyId: string,
    breachType: string,
    tenantId: string,
  ) {
    // Audit log the breach natively
    await withSuperAdminTransaction(async (tx) =>
      tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "ticket",
        entityId: ticketId,
        actorId: "SYSTEM", // System generated
        action: "sla_breached",
        newValues: { breachType },
      }),
    );

    // Execute Escalations
    const escalations = await withSuperAdminTransaction(async (tx) =>
      tx.select().from(slaEscalation).where(eq(slaEscalation.slaId, policyId)),
    );
    const activeEscalations = escalations.filter(
      (e) => e.breachType === breachType,
    );

    for (const esc of activeEscalations) {
      try {
        if (esc.actionType === "REASSIGN" && esc.targetId) {
          await TicketService.assignTicket(
            tenantId,
            ticketId,
            "SYSTEM",
            esc.targetId,
          );
          console.log(
            `SLA Escalation: Reassigned ticket ${ticketId} to ${esc.targetId}`,
          );
        } else if (esc.actionType === "BUMP_PRIORITY") {
          await TicketService.updatePriority(
            tenantId,
            ticketId,
            "SYSTEM",
            "critical",
          );
          console.log(`SLA Escalation: Bumped priority for ticket ${ticketId}`);
        } else if (esc.actionType === "NOTIFY_MANAGER") {
          console.log(
            `SLA Escalation: Manager notification dispatched for ticket ${ticketId}`,
          );
        }
      } catch (err) {
        console.error(
          `Failed to execute SLA Escalation for ticket ${ticketId}:`,
          err,
        );
      }
    }

    // Phase 10: Emit SLA Violation Event
    import("../infra/events").then(({ emitEvent }) => {
      emitEvent("sla.violation", {
        ticketId,
        policyId,
        organizationId: tenantId,
        breachType,
      });
    });

    // Phase 11: Run user-defined escalation rules (first_breach / repeated_breach)
    try {
      const prior = await SlaEscalationRuleService.countTicketBreaches(ticketId);
      const cond = prior <= 1 ? "first_breach" : "repeated_breach";
      await SlaEscalationRuleService.runForEvent(tenantId, cond, ticketId, { breachType });
    } catch (err) {
      console.error("Escalation rule engine failed", err);
    }
  }

  public async close() {
    if (this.scanTimer) clearInterval(this.scanTimer);
    await this.worker.close();
  }
}

async function alreadyFired(ruleId: string, ticketId: string, action: string): Promise<boolean> {
  const rows = await withSuperAdminTransaction(async (tx) =>
    tx
      .select({ newValues: auditLog.newValues })
      .from(auditLog)
      .where(and(eq(auditLog.entityId, ticketId), eq(auditLog.action, action)))
      .limit(100),
  );
  return rows.some((r) => (r.newValues as any)?.ruleId === ruleId);
}

async function markFired(ruleId: string, ticketId: string, tenantId: string, action: string) {
  await withSuperAdminTransaction(async (tx) =>
    tx.insert(auditLog).values({
      organizationId: tenantId,
      entityType: "ticket",
      entityId: ticketId,
      actorId: "SYSTEM",
      action,
      newValues: { ruleId },
    }),
  );
}
