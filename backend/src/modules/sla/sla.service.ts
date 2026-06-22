import { eq, and } from "drizzle-orm";
import { Queue } from "bullmq";
import { db, withTenantTransaction } from "../../infra/db";
import { sla, NewSla } from "./sla.schema";
import { ticket } from "../ticket/ticket.schema";
import { organization } from "../organization/organization.schema";
import { env } from "../../infra/env";
import { addBusinessMinutes, BusinessHoursConfig } from "../../lib/business-hours";

// The transaction handle passed by withTenantTransaction (tenant GUC already set).
type TenantTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const redisConfig = {
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD || undefined,
};

// Singleton Queue for SLA
export const slaQueue = new Queue("sla-engine", { connection: redisConfig });

export const SlaService = {
  findAll: async (tenantId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      return tx.select().from(sla).where(eq(sla.organizationId, tenantId));
    });
  },

  findById: async (tenantId: string, id: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx.select().from(sla).where(eq(sla.id, id)).limit(1);
      return result[0];
    });
  },

  create: async (tenantId: string, data: Omit<NewSla, "organizationId">) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx.insert(sla).values({ ...data, organizationId: tenantId }).returning();
      return result[0];
    });
  },

  update: async (tenantId: string, id: string, data: Partial<NewSla>) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx.update(sla).set(data).where(eq(sla.id, id)).returning();
      return result[0];
    });
  },

  remove: async (tenantId: string, id: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      await tx.delete(sla).where(eq(sla.id, id));
    });
  },

  // Runs on the caller's tenant transaction (`tx`) so RLS sees the active tenant.
  attachSlaToTicket: async (
    tx: TenantTx,
    ticketId: string,
    organizationId: string,
    priority: string,
    departmentId?: string,
  ) => {
    // Match most-specific active policy first:
    //  score 3 = dept + priority match
    //  score 2 = dept match only
    //  score 1 = priority match only
    //  score 0 = catch-all (both null)
    //  score -1 = scoping field set but doesn't match → skip
    const policies = await tx.select().from(sla).where(
      and(eq(sla.organizationId, organizationId), eq(sla.isActive, true))
    );

    const deptId = departmentId ?? null;
    const pri = priority.toLowerCase();
    const score = (p: typeof policies[number]) => {
      let s = 0;
      if (p.departmentId !== null) {
        if (p.departmentId !== deptId) return -1;
        s += 2;
      }
      if (p.priority !== null) {
        if (p.priority !== pri) return -1;
        s += 1;
      }
      return s;
    };

    const policy = policies
      .map((p) => ({ p, s: score(p) }))
      .filter(({ s }) => s >= 0)
      .sort((a, b) => b.s - a.s)[0]?.p;

    if (!policy) return; // No SLA applies

    // Fetch org business hours (if configured)
    const [orgRow] = await tx
      .select({ businessHoursConfig: organization.businessHoursConfig })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);
    const bh = orgRow?.businessHoursConfig as BusinessHoursConfig | null | undefined;

    // Fetch ticket creation time
    const [ticketData] = await tx
      .select({ createdAt: ticket.createdAt })
      .from(ticket)
      .where(eq(ticket.id, ticketId))
      .limit(1);

    if (!ticketData) return;
    
    const baseTime = ticketData.createdAt;

    const calcTarget = (mins: number) =>
      bh?.timezone && bh?.days
        ? addBusinessMinutes(baseTime, mins, bh)
        : new Date(baseTime.getTime() + mins * 60000);

    const firstResponseTargetAt = calcTarget(policy.firstResponseTimeMins);
    const resolutionTargetAt    = calcTarget(policy.resolutionTimeMins);

    await tx.update(ticket).set({
      slaId: policy.id,
      firstResponseTargetAt,
      resolutionTargetAt,
      firstResponseMet: false,
      resolutionBreached: false,
    }).where(eq(ticket.id, ticketId));

    // Enqueue BullMQ Delayed Jobs
    const firstResponseDelay = firstResponseTargetAt.getTime() - Date.now();
    await slaQueue.add("first_response_check", { ticketId, policyId: policy.id }, { delay: Math.max(firstResponseDelay, 0) });

    const resolutionDelay = resolutionTargetAt.getTime() - Date.now();
    await slaQueue.add("resolution_check", { ticketId, policyId: policy.id }, { delay: Math.max(resolutionDelay, 0) });
  },

  markFirstResponseMet: async (tx: TenantTx, ticketId: string) => {
    await tx.update(ticket).set({ firstResponseMet: true }).where(eq(ticket.id, ticketId));
  }
};
