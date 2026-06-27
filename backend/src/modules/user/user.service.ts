import { eq, and, or, ilike } from "drizzle-orm";
import { withTenantTransaction, withSuperAdminTransaction } from "../../infra/db";
import { user, NewUser } from "./user.schema";

export const UserService = {
  findAll: async (tenantId: string, opts?: { search?: string; limit?: number; offset?: number }) => {
    return withTenantTransaction(tenantId, async (tx) => {
      let where = eq(user.organizationId, tenantId) as any;
      
      if (opts?.search) {
        const searchCondition = or(
          ilike(user.firstName, `%${opts.search}%`),
          ilike(user.lastName, `%${opts.search}%`),
          ilike(user.email, `%${opts.search}%`)
        );
        where = and(where, searchCondition);
      }

      const query = tx.select().from(user).where(where);
      
      if (opts?.limit) query.limit(opts.limit);
      if (opts?.offset) query.offset(opts.offset);

      return query;
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
    const email = data.email.toLowerCase().trim();
    // Emails are globally unique — login resolves by email across all tenants.
    // Check globally (RLS would hide other tenants' rows in a tenant tx).
    const [dupe] = await withSuperAdminTransaction(async (tx) =>
      tx.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1),
    );
    if (dupe) throw new Error("An account with this email already exists");

    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx.insert(user).values({ ...data, email, organizationId: tenantId }).returning();
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
      const [target] = await tx
        .select({ globalRole: user.globalRole })
        .from(user)
        .where(eq(user.id, id))
        .limit(1);
      if (!target) throw new Error("User not found");
      // The platform SUPER_ADMIN is the system root account — never deletable.
      if (target.globalRole === "SUPER_ADMIN") {
        throw new Error("The SUPER_ADMIN account cannot be deleted");
      }
      await tx.delete(user).where(eq(user.id, id));
    });
  },

  // Self-service: a user sets their own Discord-style availability.
  updateAvailability: async (tenantId: string, userId: string, availability: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [updated] = await tx
        .update(user)
        .set({ availability })
        .where(and(eq(user.id, userId), eq(user.organizationId, tenantId)))
        .returning();
      return updated;
    });
  },

  // userId -> availability for everyone in the tenant. Seeds the frontend presence store.
  availabilityMap: async (tenantId: string): Promise<Record<string, string>> => {
    return withTenantTransaction(tenantId, async (tx) => {
      const rows = await tx
        .select({ id: user.id, availability: user.availability })
        .from(user)
        .where(eq(user.organizationId, tenantId));
      return Object.fromEntries(rows.map((r) => [r.id, r.availability]));
    });
  },
};
