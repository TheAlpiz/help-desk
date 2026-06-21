import { and, eq } from "drizzle-orm";
import { department, NewDepartment } from "./department.schema";
import { user } from "../user/user.schema";
import { withTenantTransaction } from "../../infra/db";

export const DepartmentService = {
  findAll: async (tenantId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      return tx.select().from(department).where(eq(department.organizationId, tenantId));
    });
  },

  findById: async (tenantId: string, id: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx
        .select()
        .from(department)
        .where(eq(department.id, id))
        .limit(1);
      return result[0];
    });
  },

  create: async (tenantId: string, data: Omit<NewDepartment, "organizationId">) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx.insert(department).values({ ...data, organizationId: tenantId }).returning();
      return result[0];
    });
  },

  update: async (tenantId: string, id: string, data: Partial<NewDepartment>) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx
        .update(department)
        .set(data)
        .where(eq(department.id, id))
        .returning();
      return result[0];
    });
  },

  remove: async (tenantId: string, id: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      await tx.delete(department).where(eq(department.id, id));
    });
  },

  listMembers: async (tenantId: string, departmentId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      return tx
        .select({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          globalRole: user.globalRole,
          status: user.status,
        })
        .from(user)
        .where(eq(user.departmentId, departmentId));
    });
  },

  addMember: async (tenantId: string, departmentId: string, userId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx
        .update(user)
        .set({ departmentId })
        .where(eq(user.id, userId))
        .returning({ id: user.id, departmentId: user.departmentId });
      return result[0];
    });
  },

  removeMember: async (tenantId: string, departmentId: string, userId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      await tx
        .update(user)
        .set({ departmentId: null })
        .where(and(eq(user.id, userId), eq(user.departmentId, departmentId)));
    });
  },
};
