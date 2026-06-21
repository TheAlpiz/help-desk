import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";

export const contact = pgTable("contact", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 255 }).notNull().default(""),
  lastName: varchar("last_name", { length: 255 }).notNull().default(""),
  ...timestamps,
});

export type Contact = typeof contact.$inferSelect;
export type NewContact = typeof contact.$inferInsert;
