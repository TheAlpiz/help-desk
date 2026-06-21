import { eq, and, desc, gte, lte } from "drizzle-orm";
import { withTenantTransaction, withSuperAdminTransaction } from "../../infra/db/index";
import { auditLog, NewAuditLog } from "./audit-log.schema";
import { GetAuditLogsQueryInput } from "@help-desk/shared";

export const AuditLogService = {
  findAll: async (tenantId: string, filters: GetAuditLogsQueryInput) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const conditions = [eq(auditLog.organizationId, tenantId)];
      if (filters.entityType) conditions.push(eq(auditLog.entityType, filters.entityType));
      if (filters.entityId) conditions.push(eq(auditLog.entityId, filters.entityId));
      if (filters.actorId) conditions.push(eq(auditLog.actorId, filters.actorId));
      if (filters.action) conditions.push(eq(auditLog.action, filters.action));
      if (filters.from) conditions.push(gte(auditLog.createdAt, new Date(filters.from)));
      if (filters.to) conditions.push(lte(auditLog.createdAt, new Date(filters.to)));

      return tx
        .select()
        .from(auditLog)
        .where(and(...conditions))
        .orderBy(desc(auditLog.createdAt))
        .limit(filters.limit)
        .offset(filters.offset);
    });
  },

  findByEntity: async (tenantId: string, entityType: string, entityId: string) => {
    return withTenantTransaction(tenantId, async (tx) =>
      tx
        .select()
        .from(auditLog)
        .where(
          and(
            eq(auditLog.organizationId, tenantId),
            eq(auditLog.entityType, entityType),
            eq(auditLog.entityId, entityId),
          ),
        )
        .orderBy(desc(auditLog.createdAt)),
    );
  },

  // For background workers / super-admin context only.
  // Services inside tenant transactions insert via tx.insert(auditLog) directly.
  log: async (data: NewAuditLog) => {
    return withSuperAdminTransaction(async (tx) => {
      const [row] = await tx.insert(auditLog).values(data).returning();
      return row;
    });
  },
};
