import { pgTable, uuid, varchar, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";

// Inbound ticket filter rules — see @help-desk/shared ticket-filter.schema.
// A matching active rule causes the inbound ticket to be dropped (never created).
export const ticketFilterRule = pgTable("ticket_filter_rule", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  field: varchar("field", { length: 50 }).notNull(),
  value: varchar("value", { length: 512 }).notNull(),
  action: varchar("action", { length: 30 }).notNull().default("drop"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export type TicketFilterRule = typeof ticketFilterRule.$inferSelect;
export type NewTicketFilterRule = typeof ticketFilterRule.$inferInsert;
