import { pgTable, uuid, varchar, text, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";
import { user } from "../user/user.schema";

export const automation = pgTable("automation", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  createdById: uuid("created_by_id").references(() => user.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  trigger: varchar("trigger", { length: 100 }).notNull(),
  conditions: jsonb("conditions").notNull().$type<AutomationCondition[]>(),
  actions: jsonb("actions").notNull().$type<AutomationActionDef[]>(),
  conditionMatch: varchar("condition_match", { length: 10 }).notNull().default("all"),
  isActive: boolean("is_active").notNull().default(true),
  runCount: integer("run_count").notNull().default(0),
  ...timestamps,
});

export type AutomationCondition = {
  id: string;
  field: string;
  operator: string;
  value: string;
};

export type AutomationActionDef =
  | { type: "set_status"; value: string }
  | { type: "set_priority"; value: string }
  | { type: "assign_to"; value: string }
  | { type: "set_department"; value: string }
  | { type: "add_tag"; value: string }
  | { type: "remove_tag"; value: string }
  | { type: "send_email"; value: string; subject?: string; assignee?: string }
  | { type: "add_note"; value: string }
  | {
      type: "create_task";
      value: string;
      assignee?: string;
      priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      dueInDays?: number;
    }
  | { type: "notify"; value: string; assignee?: string }
  | { type: "webhook"; value: string }
  | { type: "resolve_ticket"; value?: string }
  | { type: "close_ticket"; value?: string }
  | { type: "archive_ticket"; value?: string }
  | { type: "set_due_date"; value?: string; dueInDays?: number };

export type Automation = typeof automation.$inferSelect;
export type NewAutomation = typeof automation.$inferInsert;
