import { eq } from "drizzle-orm";
import { organization, NewOrganization } from "./organization.schema";
import { withTenantTransaction, withSuperAdminTransaction } from "../../infra/db";
import { PermissionService } from "../permission/permission.service";

export const OrganizationService = {
  // Only Super Admins can fetch all orgs
  findAll: async () => {
    return withSuperAdminTransaction(async (tx) => {
      return tx.select().from(organization);
    });
  },

  // Resolve a tenant from its subdomain. Runs before any tenant context exists,
  // so it must use the super-admin (bypass) path. Returns id + status only.
  findBySubdomain: async (subdomain: string) => {
    return withSuperAdminTransaction(async (tx) => {
      const result = await tx
        .select({ id: organization.id, status: organization.status })
        .from(organization)
        .where(eq(organization.subdomain, subdomain))
        .limit(1);
      return result[0];
    });
  },

  findById: async (tenantId: string, id: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      // Organization members should only see their own organization
      if (id !== tenantId) return null;
      
      const result = await tx
        .select()
        .from(organization)
        .where(eq(organization.id, id))
        .limit(1);
      return result[0];
    });
  },

  // Only Super Admins can create organizations via API
  create: async (data: NewOrganization) => {
    return withSuperAdminTransaction(async (tx) => {
      const result = await tx.insert(organization).values(data).returning();
      // Every new tenant gets the standard system roles + permission matrix.
      await PermissionService.seedSystemRoles(tx, result[0].id);
      return result[0];
    });
  },

  update: async (tenantId: string, id: string, data: Partial<NewOrganization>) => {
    return withTenantTransaction(tenantId, async (tx) => {
      if (id !== tenantId) throw new Error("Unauthorized");

      const result = await tx
        .update(organization)
        .set(data)
        .where(eq(organization.id, id))
        .returning();
      return result[0];
    });
  },

  // Only Super Admins can delete orgs
  remove: async (id: string) => {
    return withSuperAdminTransaction(async (tx) => {
      await tx.delete(organization).where(eq(organization.id, id));
    });
  },
};
