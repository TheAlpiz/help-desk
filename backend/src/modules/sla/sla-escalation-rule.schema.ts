import { pgTable, uuid, varchar, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";
import { user } from "../user/user.schema";

export type SlaEscalationActionDef = {
  id: string;
  type: "notify_agent" | "notify_manager" | "reassign" | "add_tag" | "increase_priority";
  value: string;
};

export const slaEscalationRule = pgTable("sla_escalation_rule", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  createdById: uuid("created_by_id").references(() => user.id),
  name: varchar("name", { length: 255 }).notNull(),
  condition: varchar("condition", { length: 64 }).notNull(),
  thresholdMinutes: integer("threshold_minutes"),
  actions: jsonb("actions").notNull().$type<SlaEscalationActionDef[]>(),
  isActive: boolean("is_active").notNull().default(true),
  runCount: integer("run_count").notNull().default(0),
  ...timestamps,
});

export type SlaEscalationRule = typeof slaEscalationRule.$inferSelect;
export type NewSlaEscalationRule = typeof slaEscalationRule.$inferInsert;
