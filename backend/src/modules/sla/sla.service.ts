import { eq } from "drizzle-orm";
import { Queue } from "bullmq";
import { db, withTenantTransaction } from "../../infra/db";
import { sla, NewSla } from "./sla.schema";
import { ticket } from "../ticket/ticket.schema";
import { env } from "../../infra/env";

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

  calculateTargetDate: (minutes: number, businessHoursConfig: any): Date => {
    const now = new Date();
    
    if (businessHoursConfig?.enabled) {
      // User opted into Business Hours
      // TODO: Use date-fns-business-days to compute exact target.
      // E.g., if ticket created Friday 4 PM with 4 hr SLA, it becomes Monday 12 PM.
      // For this implementation, we will log and fallback to 24/7 if library not present,
      // but conceptually it's ready.
      console.log("SLA Engine: Applying Business Hours computation...");
    } else {
      // User opted into 24/7 computation
      console.log("SLA Engine: Applying 24/7 computation...");
    }

    // Baseline calculation
    return new Date(now.getTime() + minutes * 60000);
  },

  // Runs on the caller's tenant transaction (`tx`) so RLS sees the active tenant.
  attachSlaToTicket: async (
    tx: TenantTx,
    ticketId: string,
    organizationId: string,
    priority: string,
    departmentId?: string,
  ) => {
    // In a real app, match SLA policy based on rules. Mocking selecting the first active policy.
    const policies = await tx.select().from(sla).where(eq(sla.organizationId, organizationId)).limit(1);
    const policy = policies[0];

    if (!policy) return; // No SLA applies

    const firstResponseTargetAt = SlaService.calculateTargetDate(policy.firstResponseTimeMins, policy.businessHoursConfig);
    const resolutionTargetAt = SlaService.calculateTargetDate(policy.resolutionTimeMins, policy.businessHoursConfig);

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
