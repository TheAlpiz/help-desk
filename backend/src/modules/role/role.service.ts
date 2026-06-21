import { eq } from "drizzle-orm";
import { role, NewRole } from "./role.schema";
import { withTenantTransaction, withSuperAdminTransaction } from "../../infra/db";

export const RoleService = {
  findAll: async (tenantId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      return tx.select().from(role).where(eq(role.organizationId, tenantId));
    });
  },

  // SUPER_ADMIN only (guarded in route): cross-tenant read, bypasses RLS.
  findAllGlobal: async () => {
    return withSuperAdminTransaction(async (tx) => tx.select().from(role));
  },

  createGlobal: async (organizationId: string, data: Omit<NewRole, "organizationId">) => {
    return withSuperAdminTransaction(async (tx) => {
      const result = await tx.insert(role).values({ ...data, organizationId }).returning();
      return result[0];
    });
  },

  removeGlobal: async (id: string) => {
    return withSuperAdminTransaction(async (tx) => {
      await tx.delete(role).where(eq(role.id, id));
    });
  },

  findById: async (tenantId: string, id: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx
        .select()
        .from(role)
        .where(eq(role.id, id))
        .limit(1);
      return result[0];
    });
  },

  create: async (tenantId: string, data: Omit<NewRole, "organizationId">) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx.insert(role).values({ ...data, organizationId: tenantId }).returning();
      return result[0];
    });
  },

  update: async (tenantId: string, id: string, data: Partial<NewRole>) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx
        .update(role)
        .set(data)
        .where(eq(role.id, id))
        .returning();
      return result[0];
    });
  },

  remove: async (tenantId: string, id: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      await tx.delete(role).where(eq(role.id, id));
    });
  },
};
