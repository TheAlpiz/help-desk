import { pgTable, uuid, varchar, text, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";

export const role = pgTable("role", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").default(false).notNull(),
  ...timestamps,
});

export type Role = typeof role.$inferSelect;
export type NewRole = typeof role.$inferInsert;
