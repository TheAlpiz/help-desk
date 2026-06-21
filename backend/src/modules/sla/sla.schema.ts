import { pgTable, uuid, varchar, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";

export const sla = pgTable("sla", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  firstResponseTimeMins: integer("first_response_time_mins").notNull(),
  resolutionTimeMins: integer("resolution_time_mins").notNull(),
  businessHoursConfig: jsonb("business_hours_config"),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
});

export type Sla = typeof sla.$inferSelect;
export type NewSla = typeof sla.$inferInsert;
