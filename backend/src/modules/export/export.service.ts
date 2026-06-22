import { eq, and, gte, lte, isNull, desc } from "drizzle-orm";
import { withTenantTransaction } from "../../infra/db";
import { ticket } from "../ticket/ticket.schema";
import { task } from "../task/task.schema";
import { user } from "../user/user.schema";
import { auditLog } from "../audit-log/audit-log.schema";
import { sla } from "../sla/sla.schema";

interface DateRangeFilter {
  from?: string;
  to?: string;
}

function dateConditions(
  column: any,
  filters: DateRangeFilter,
): ReturnType<typeof eq>[] {
  const conds: ReturnType<typeof eq>[] = [];
  if (filters.from) conds.push(gte(column, new Date(filters.from)));
  if (filters.to) {
    // Include the entire "to" day by pushing to end-of-day
    const toDate = new Date(filters.to);
    toDate.setHours(23, 59, 59, 999);
    conds.push(lte(column, toDate));
  }
  return conds;
}

export const ExportService = {
  /**
   * Export all tickets (excluding soft-deleted) for the tenant.
   */
  exportTickets: async (tenantId: string, filters: DateRangeFilter) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const conditions = [
        eq(ticket.organizationId, tenantId),
        isNull(ticket.deletedAt),
        ...dateConditions(ticket.createdAt, filters),
      ];

      const rows = await tx
        .select({
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          assigneeId: ticket.assigneeId,
          requesterId: ticket.requesterId,
          contactId: ticket.contactId,
          departmentId: ticket.departmentId,
          mailboxId: ticket.mailboxId,
          slaId: ticket.slaId,
          firstResponseMet: ticket.firstResponseMet,
          resolutionBreached: ticket.resolutionBreached,
          firstResponseTargetAt: ticket.firstResponseTargetAt,
          resolutionTargetAt: ticket.resolutionTargetAt,
          resolvedAt: ticket.resolvedAt,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        })
        .from(ticket)
        .where(and(...conditions))
        .orderBy(desc(ticket.createdAt));

      return rows;
    });
  },

  /**
   * Export all tasks for the tenant.
   */
  exportTasks: async (tenantId: string, filters: DateRangeFilter) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const conditions = [
        eq(task.organizationId, tenantId),
        isNull(task.deletedAt),
        ...dateConditions(task.createdAt, filters),
      ];

      const rows = await tx
        .select({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          ticketId: task.ticketId,
          parentTaskId: task.parentTaskId,
          creatorId: task.creatorId,
          assigneeId: task.assigneeId,
          dueDate: task.dueDate,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        })
        .from(task)
        .where(and(...conditions))
        .orderBy(desc(task.createdAt));

      return rows;
    });
  },

  /**
   * Export all users for the tenant.
   * IMPORTANT: Excludes passwordHash for security.
   */
  exportUsers: async (tenantId: string, filters: DateRangeFilter) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const conditions = [
        eq(user.organizationId, tenantId),
        isNull(user.deletedAt),
        ...dateConditions(user.createdAt, filters),
      ];

      const rows = await tx
        .select({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
          globalRole: user.globalRole,
          departmentId: user.departmentId,
          preferredLanguage: user.preferredLanguage,
          emailVerifiedAt: user.emailVerifiedAt,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
        .from(user)
        .where(and(...conditions))
        .orderBy(desc(user.createdAt));

      return rows;
    });
  },

  /**
   * Export audit logs for the tenant.
   */
  exportAuditLogs: async (tenantId: string, filters: DateRangeFilter) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const conditions = [
        eq(auditLog.organizationId, tenantId),
        ...dateConditions(auditLog.createdAt, filters),
      ];

      const rows = await tx
        .select({
          id: auditLog.id,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          actorId: auditLog.actorId,
          action: auditLog.action,
          oldValues: auditLog.oldValues,
          newValues: auditLog.newValues,
          ipAddress: auditLog.ipAddress,
          userAgent: auditLog.userAgent,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .where(and(...conditions))
        .orderBy(desc(auditLog.createdAt));

      return rows;
    });
  },

  /**
   * Export SLA compliance report — tickets joined with their SLA policy.
   */
  exportSlaReports: async (tenantId: string, filters: DateRangeFilter) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const conditions = [
        eq(ticket.organizationId, tenantId),
        isNull(ticket.deletedAt),
        ...dateConditions(ticket.createdAt, filters),
      ];

      const rows = await tx
        .select({
          ticketId: ticket.id,
          ticketSubject: ticket.subject,
          ticketStatus: ticket.status,
          ticketPriority: ticket.priority,
          slaName: sla.name,
          firstResponseTimeMins: sla.firstResponseTimeMins,
          resolutionTimeMins: sla.resolutionTimeMins,
          firstResponseTargetAt: ticket.firstResponseTargetAt,
          resolutionTargetAt: ticket.resolutionTargetAt,
          firstResponseMet: ticket.firstResponseMet,
          resolutionBreached: ticket.resolutionBreached,
          resolvedAt: ticket.resolvedAt,
          ticketCreatedAt: ticket.createdAt,
        })
        .from(ticket)
        .leftJoin(sla, eq(ticket.slaId, sla.id))
        .where(and(...conditions))
        .orderBy(desc(ticket.createdAt));

      return rows;
    });
  },
};
