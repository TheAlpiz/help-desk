import { pgTable, uuid, varchar, integer, jsonb, boolean, AnyPgColumn } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";
import { department } from "../department/department.schema";

export const sla = pgTable("sla", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  firstResponseTimeMins: integer("first_response_time_mins").notNull(),
  resolutionTimeMins: integer("resolution_time_mins").notNull(),
  businessHoursConfig: jsonb("business_hours_config"),
  isActive: boolean("is_active").default(true).notNull(),
  // Scoping filters — null means "match any". More-specific policies win.
  departmentId: uuid("department_id").references((): AnyPgColumn => department.id, { onDelete: "set null" }),
  priority: varchar("priority", { length: 50 }),
  ...timestamps,
});

export type Sla = typeof sla.$inferSelect;
export type NewSla = typeof sla.$inferInsert;
