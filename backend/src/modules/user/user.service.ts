import { eq } from "drizzle-orm";
import { withTenantTransaction, withSuperAdminTransaction } from "../../infra/db";
import { user, NewUser } from "./user.schema";

export const UserService = {
  findAll: async (tenantId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      return tx.select().from(user).where(eq(user.organizationId, tenantId));
    });
  },

  // SUPER_ADMIN only (guarded in route): cross-tenant read, bypasses RLS.
  findAllGlobal: async () => {
    return withSuperAdminTransaction(async (tx) => tx.select().from(user));
  },

  findById: async (tenantId: string, id: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx
        .select()
        .from(user)
        .where(eq(user.id, id))
        .limit(1);
      return result[0];
    });
  },

  create: async (tenantId: string, data: NewUser) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx.insert(user).values({ ...data, organizationId: tenantId }).returning();
      return result[0];
    });
  },

  update: async (tenantId: string, id: string, data: Partial<NewUser>) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx
        .update(user)
        .set(data)
        .where(eq(user.id, id))
        .returning();
      return result[0];
    });
  },

  remove: async (tenantId: string, id: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      await tx.delete(user).where(eq(user.id, id));
    });
  },
};
