import { db } from "./index";
import { logger } from "../logger";

/**
 * Tables that own a direct `organization_id` column.
 * Policy: row visible iff organization_id === current tenant (or RLS bypassed).
 */
const DIRECT_TENANT_TABLES = [
  "ticket",
  "contact",
  "user",
  "mailbox",
  "attachment",
  "audit_log",
  "task",
  "sla",
  "department",
  "role",
  "user_role",
  "session",
  "user_note",
];

/**
 * Child tables with no `organization_id` — tenant ownership is derived from a
 * parent row. Policy: row visible iff the parent row belongs to the tenant.
 */
const CHILD_TENANT_TABLES: { table: string; fk: string; parent: string }[] = [
  { table: "ticket_message", fk: "ticket_id", parent: "ticket" },
  { table: "ticket_tag", fk: "ticket_id", parent: "ticket" },
  { table: "ticket_link", fk: "source_ticket_id", parent: "ticket" },
  { table: "task_comment", fk: "task_id", parent: "task" },
  { table: "notification", fk: "user_id", parent: "user" },
  { table: "notification_preference", fk: "user_id", parent: "user" },
  { table: "permission", fk: "role_id", parent: "role" },
  { table: "sla_escalation", fk: "sla_id", parent: "sla" },
];

/**
 * Installs Postgres Row Level Security so tenant isolation is enforced by the
 * database itself, independent of any application bug.
 *
 * Two helper functions read the per-transaction GUCs set by
 * `withTenantTransaction` / `withSuperAdminTransaction`:
 *   - app.current_tenant_id : the active Organization UUID
 *   - app.bypass_rls        : "on" for trusted super-admin / worker contexts
 *
 * FORCE ROW LEVEL SECURITY is required because the application connects as the
 * table owner, and owners bypass RLS unless it is forced.
 */
export async function setupRowLevelSecurity() {
  logger.info("[RLS] Installing tenant isolation policies...");

  const statements: string[] = [];

  // --- Helper functions (STABLE; null-safe tenant cast) ---
  statements.push(`
    CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid AS $$
      SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
    $$ LANGUAGE sql STABLE;
  `);
  statements.push(`
    CREATE OR REPLACE FUNCTION app_bypass_rls() RETURNS boolean AS $$
      SELECT COALESCE(current_setting('app.bypass_rls', true) = 'on', false);
    $$ LANGUAGE sql STABLE;
  `);

  // --- Organization root: a tenant may only see/modify its own org row ---
  statements.push(rlsEnable("organization"));
  statements.push(
    policy(
      "organization",
      "tenant_isolation_organization",
      `app_bypass_rls() OR id = app_current_tenant()`,
    ),
  );

  // --- Direct organization_id tables ---
  for (const table of DIRECT_TENANT_TABLES) {
    const predicate = `app_bypass_rls() OR organization_id = app_current_tenant()`;
    statements.push(rlsEnable(table));
    statements.push(policy(table, `tenant_isolation_${table}`, predicate));
  }

  // --- Child tables: ownership derived from the parent's organization_id ---
  for (const { table, fk, parent } of CHILD_TENANT_TABLES) {
    const parentMatch = `EXISTS (SELECT 1 FROM "${parent}" p WHERE p.id = "${table}".${fk} AND p.organization_id = app_current_tenant())`;
    const predicate = `app_bypass_rls() OR (${parentMatch})`;
    statements.push(rlsEnable(table));
    statements.push(policy(table, `tenant_isolation_${table}`, predicate));
  }

  try {
    for (const stmt of statements) {
      await db.execute(stmt);
    }
    logger.info(
      `[RLS] Tenant isolation enforced on ${1 + DIRECT_TENANT_TABLES.length + CHILD_TENANT_TABLES.length} tables.`,
    );
  } catch (error) {
    logger.error(
      { error },
      "[RLS] Failed to install Row Level Security policies",
    );
    throw error;
  }
}

function rlsEnable(table: string): string {
  return `
    ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;
  `;
}

function policy(table: string, name: string, predicate: string): string {
  // Recreate idempotently. Same predicate guards reads (USING) and writes (WITH CHECK),
  // so a tenant can neither see nor insert/update rows outside its scope.
  return `
    DROP POLICY IF EXISTS ${name} ON "${table}";
    CREATE POLICY ${name} ON "${table}"
      USING (${predicate})
      WITH CHECK (${predicate});
  `;
}
