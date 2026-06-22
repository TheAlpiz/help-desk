import { withTenantTransaction } from "../../infra/db";
import { ticket } from "../ticket/ticket.schema";
import { task } from "../task/task.schema";
import { eq, count, sql, and, lt } from "drizzle-orm";

export const AnalyticsService = {
  getTicketsSummary: async (tenantId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const byStatus = await tx.select({
        status: ticket.status,
        count: count()
      })
      .from(ticket)
      .where(eq(ticket.organizationId, tenantId))
      .groupBy(ticket.status);

      const byDepartment = await tx.select({
        departmentId: ticket.departmentId,
        count: count()
      })
      .from(ticket)
      .where(eq(ticket.organizationId, tenantId))
      .groupBy(ticket.departmentId);

      return { byStatus, byDepartment };
    });
  },

  getAgentPerformance: async (tenantId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const resolvedStats = await tx.select({
        agentId: ticket.assigneeId,
        resolvedCount: count()
      })
      .from(ticket)
      .where(and(eq(ticket.organizationId, tenantId), eq(ticket.status, "resolved")))
      .groupBy(ticket.assigneeId);

      return { resolvedStats };
    });
  },

  getSlaCompliance: async (tenantId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const totalWithFirstResponseSla = await tx.select({ count: count() }).from(ticket)
        .where(and(eq(ticket.organizationId, tenantId), sql`${ticket.firstResponseTargetAt} IS NOT NULL`));

      const metFirstResponseSla = await tx.select({ count: count() }).from(ticket)
        .where(and(eq(ticket.organizationId, tenantId), eq(ticket.firstResponseMet, true)));

      const breachedResolutionSla = await tx.select({ count: count() }).from(ticket)
        .where(and(eq(ticket.organizationId, tenantId), eq(ticket.resolutionBreached, true)));

      const total = Number(totalWithFirstResponseSla[0].count);
      const met = Number(metFirstResponseSla[0].count);
      return {
        totalWithFirstResponseSla: total,
        metFirstResponseSla: met,
        firstResponseComplianceRate: total > 0 ? Math.round((met / total) * 100) : 0,
        resolutionBreached: Number(breachedResolutionSla[0].count),
      };
    });
  },

  getTaskCompletion: async (tenantId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [totalRow] = await tx.select({ count: count() }).from(task).where(eq(task.organizationId, tenantId));
      const [doneRow] = await tx.select({ count: count() }).from(task).where(and(eq(task.organizationId, tenantId), eq(task.status, "DONE")));
      const [overdueRow] = await tx.select({ count: count() }).from(task).where(
        and(eq(task.organizationId, tenantId), lt(task.dueDate, new Date()), sql`${task.status} != 'DONE'`),
      );

      const total = Number(totalRow.count);
      const completed = Number(doneRow.count);
      return {
        total,
        completed,
        overdue: Number(overdueRow.count),
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  }
};
