import { pgTable, uuid, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    actorId: varchar("actor_id", { length: 255 }), // UUID or 'SYSTEM'
    action: varchar("action", { length: 100 }).notNull(),
    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 512 }),
    ...timestamps,
  },
  (t) => [
    index("audit_log_org_idx").on(t.organizationId),
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
    index("audit_log_actor_idx").on(t.actorId),
    index("audit_log_created_at_idx").on(t.createdAt),
  ],
);

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;

// Sentinel actorId for system/automation-generated audit events (no human actor).
// Use this everywhere instead of ad-hoc "system"/"SYSTEM" literals.
export const SYSTEM_ACTOR_ID = "SYSTEM";
