import { pgTable, uuid, varchar, text } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";

export const department = pgTable("department", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ...timestamps,
});

export type Department = typeof department.$inferSelect;
export type NewDepartment = typeof department.$inferInsert;
