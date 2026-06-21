import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { sla } from "./sla.schema";

export const slaEscalation = pgTable("sla_escalation", {
  id: uuid("id").defaultRandom().primaryKey(),
  slaId: uuid("sla_id").notNull().references(() => sla.id, { onDelete: 'cascade' }),
  breachType: varchar("breach_type", { length: 50 }).notNull(), // FIRST_RESPONSE or RESOLUTION
  actionType: varchar("action_type", { length: 50 }).notNull(), // REASSIGN, BUMP_PRIORITY, NOTIFY_MANAGER
  targetId: uuid("target_id"), // Optional: user ID to reassign to
  ...timestamps,
});

export type SlaEscalation = typeof slaEscalation.$inferSelect;
export type NewSlaEscalation = typeof slaEscalation.$inferInsert;
