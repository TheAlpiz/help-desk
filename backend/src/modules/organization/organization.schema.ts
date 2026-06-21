import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";

export const organization = pgTable("organization", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }).notNull().unique(),
  // Tenant subdomain, e.g. "abc" in abc.platform.com. Used to resolve tenant from host.
  subdomain: varchar("subdomain", { length: 63 }).unique(),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  ...timestamps,
});

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;
