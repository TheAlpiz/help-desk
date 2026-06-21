import { pgTable, uuid, varchar, text, jsonb, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";
import { user } from "../user/user.schema";

export const macro = pgTable("macro", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  createdById: uuid("created_by_id").references(() => user.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  actions: jsonb("actions").notNull().$type<MacroActionDef[]>(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export type MacroActionDef =
  | { type: "set_status"; value: string }
  | { type: "set_priority"; value: string }
  | { type: "add_tag"; value: string }
  | { type: "remove_tag"; value: string }
  | { type: "assign_to"; value: string }
  | { type: "send_reply"; value: string }
  | { type: "add_note"; value: string };

export type Macro = typeof macro.$inferSelect;
export type NewMacro = typeof macro.$inferInsert;
