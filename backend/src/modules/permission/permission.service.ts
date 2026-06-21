import { eq } from "drizzle-orm";
import { withTenantTransaction } from "../../infra/db";
import { auditLog } from "../audit-log/audit-log.schema";
import { permission, NewPermission } from "./permission.schema";
import { role } from "../role/role.schema";
import { userRole } from "../user/user-role.schema";
import { redis } from "../../infra/redis";
import { SYSTEM_ROLE_MATRIX, SystemRoleName, splitPermission } from "./permission.constants";

const PERMS_CACHE_TTL_SECONDS = 300;
const permsCacheKey = (tenantId: string, userId: string) => `perms:${tenantId}:${userId}`;

export const PermissionService = {
  // Tenant-scoped: RLS only exposes permissions whose parent role belongs to the tenant.
  findAll: async (tenantId: string) => {
    return withTenantTransaction(tenantId, async (tx) => tx.select().from(permission));
  },

  findByRoleId: async (tenantId: string, roleId: string) => {
    return withTenantTransaction(tenantId, async (tx) =>
      tx.select().from(permission).where(eq(permission.roleId, roleId)),
    );
  },

  findById: async (tenantId: string, id: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx
        .select()
        .from(permission)
        .where(eq(permission.id, id))
        .limit(1);
      return result[0];
    });
  },

  create: async (tenantId: string, data: NewPermission) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx.insert(permission).values(data).returning();
      return result[0];
    });
  },

  // Insert multiple permissions at once for a role
  bulkCreate: async (tenantId: string, permissions: NewPermission[]) => {
    if (permissions.length === 0) return [];
    return withTenantTransaction(tenantId, async (tx) =>
      tx.insert(permission).values(permissions).returning(),
    );
  },

  // Replace all permissions for a role (delete existing, insert new).
  // tenantId and actorId required for audit trail.
  replaceForRole: async (
    tenantId: string,
    actorId: string,
    roleId: string,
    entries: { resource: string; action: string }[],
  ) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const before = await tx
        .select({ resource: permission.resource, action: permission.action })
        .from(permission)
        .where(eq(permission.roleId, roleId));

      await tx.delete(permission).where(eq(permission.roleId, roleId));
      const inserted =
        entries.length > 0
          ? await tx
              .insert(permission)
              .values(entries.map((e) => ({ roleId, resource: e.resource, action: e.action })))
              .returning()
          : [];

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "role",
        entityId: roleId,
        actorId,
        action: "permissions_replaced",
        oldValues: { permissions: before },
        newValues: { permissions: entries },
      });

      return inserted;
    });
  },

  update: async (tenantId: string, id: string, data: Partial<NewPermission>) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx
        .update(permission)
        .set(data)
        .where(eq(permission.id, id))
        .returning();
      return result[0];
    });
  },

  remove: async (tenantId: string, id: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      await tx.delete(permission).where(eq(permission.id, id));
    });
  },

  /**
   * Effective permission strings for a user: union of all permissions granted by
   * their assigned roles. SUPER_ADMIN / ORG_ADMIN resolve to wildcard "*".
   * Cached in Redis; invalidate via invalidateUser on any role/permission change.
   */
  getEffectivePermissions: async (
    tenantId: string,
    userId: string,
    globalRole?: string,
  ): Promise<string[]> => {
    if (globalRole === "SUPER_ADMIN" || globalRole === "ADMIN") return ["*"];

    const key = permsCacheKey(tenantId, userId);
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached) as string[];
    } catch {
      /* cache miss is non-fatal */
    }

    const rows = await withTenantTransaction(tenantId, async (tx) =>
      tx
        .select({ resource: permission.resource, action: permission.action })
        .from(userRole)
        .innerJoin(role, eq(role.id, userRole.roleId))
        .innerJoin(permission, eq(permission.roleId, role.id))
        .where(eq(userRole.userId, userId)),
    );

    // Baseline from the user's globalRole (system role matrix), so a user gets the
    // permissions of their role even without an explicit userRole assignment.
    // Union with any extra permissions granted via assigned custom roles.
    const base =
      globalRole && globalRole in SYSTEM_ROLE_MATRIX
        ? SYSTEM_ROLE_MATRIX[globalRole as SystemRoleName].permissions
        : [];

    const perms = Array.from(
      new Set([
        ...base,
        ...rows.map((r) => (r.resource === "*" ? "*" : `${r.resource}.${r.action}`)),
      ]),
    );

    try {
      await redis.set(key, JSON.stringify(perms), { EX: PERMS_CACHE_TTL_SECONDS });
    } catch {
      /* ignore cache write errors */
    }
    return perms;
  },

  invalidateUser: async (tenantId: string, userId: string) => {
    try {
      await redis.del(permsCacheKey(tenantId, userId));
    } catch {
      /* ignore */
    }
  },

  /**
   * Seed the system roles + their permissions for a freshly created organization.
   * Runs inside the caller's (super-admin) transaction.
   */
  seedSystemRoles: async (tx: any, tenantId: string) => {
    for (const [name, def] of Object.entries(SYSTEM_ROLE_MATRIX)) {
      const [r] = await tx
        .insert(role)
        .values({ organizationId: tenantId, name, description: def.description, isSystem: true })
        .returning();
      const rows = def.permissions.map((p) => {
        const { resource, action } = splitPermission(p);
        return { roleId: r.id, resource, action };
      });
      if (rows.length) await tx.insert(permission).values(rows);
    }
  },
};
