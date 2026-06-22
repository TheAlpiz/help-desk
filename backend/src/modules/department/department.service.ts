import { and, eq, inArray, ilike } from "drizzle-orm";
import { department, NewDepartment } from "./department.schema";
import { departmentMember } from "./department-member.schema";
import { user } from "../user/user.schema";
import { withTenantTransaction } from "../../infra/db";

export const DepartmentService = {
  findAll: async (tenantId: string, opts?: { search?: string; limit?: number; offset?: number }) => {
    return withTenantTransaction(tenantId, async (tx) => {
      let where = eq(department.organizationId, tenantId) as any;
      
      if (opts?.search) {
        where = and(where, ilike(department.name, `%${opts.search}%`));
      }

      const query = tx.select().from(department).where(where);
      
      if (opts?.limit) query.limit(opts.limit);
      if (opts?.offset) query.offset(opts.offset);

      return query;
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
        .from(departmentMember)
        .innerJoin(user, eq(user.id, departmentMember.userId))
        .where(eq(departmentMember.departmentId, departmentId));
    });
  },

  addMember: async (tenantId: string, departmentId: string, userId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx
        .insert(departmentMember)
        .values({ organizationId: tenantId, departmentId, userId })
        .onConflictDoNothing()
        .returning();
      return result[0] ?? { departmentId, userId };
    });
  },

  removeMember: async (tenantId: string, departmentId: string, userId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      await tx
        .delete(departmentMember)
        .where(and(eq(departmentMember.departmentId, departmentId), eq(departmentMember.userId, userId)));
    });
  },

  // Department ids a user belongs to — drives ABAC ticket visibility.
  memberDepartmentIds: async (tenantId: string, userId: string): Promise<string[]> => {
    return withTenantTransaction(tenantId, async (tx) => {
      const rows = await tx
        .select({ departmentId: departmentMember.departmentId })
        .from(departmentMember)
        .where(eq(departmentMember.userId, userId));
      return rows.map((r) => r.departmentId);
    });
  },

  // Full department rows a user belongs to — for the user-detail UI.
  departmentsOfUser: async (tenantId: string, userId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const memberRows = await tx
        .select({ departmentId: departmentMember.departmentId })
        .from(departmentMember)
        .where(eq(departmentMember.userId, userId));
      const ids = memberRows.map((r) => r.departmentId);
      if (ids.length === 0) return [];
      return tx.select().from(department).where(inArray(department.id, ids));
    });
  },
};
