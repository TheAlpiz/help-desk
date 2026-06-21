import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { env } from "../env";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool, {
  logger: true,
});

/**
 * Wraps a database operation in a transaction and applies the tenant isolation policy.
 * This ensures that RLS (Row Level Security) prevents data leakage between tenants.
 * @param tenantId The Organization UUID
 * @param callback The database operations to perform
 */
export async function withTenantTransaction<T>(
  tenantId: string,
  callback: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // Bind the tenant for this transaction. `true` => SET LOCAL (transaction-scoped),
    // so the GUC is reset automatically when the transaction ends and never leaks
    // onto the next checkout of this pooled connection.
    await tx.execute(sql`select set_config('app.current_tenant_id', ${tenantId}, true)`);
    // Ensure we never run a tenant request with the super-admin bypass left on.
    await tx.execute(sql`select set_config('app.bypass_rls', 'off', true)`);

    return await callback(tx);
  });
}

/**
 * Wraps a database operation in a transaction WITHOUT tenant isolation.
 * Used exclusively by background workers, seed scripts, and SUPER_ADMIN global actions.
 */
export async function withSuperAdminTransaction<T>(
  callback: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // Trusted context (workers, seed, cross-tenant super-admin actions).
    // Set the bypass flag that RLS policies honour via app_bypass_rls(), so these
    // operations can read/write across all tenants. SET LOCAL keeps it scoped to
    // this transaction only.
    await tx.execute(sql`select set_config('app.current_tenant_id', '', true)`);
    await tx.execute(sql`select set_config('app.bypass_rls', 'on', true)`);
    return await callback(tx);
  });
}
