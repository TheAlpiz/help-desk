import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { role } from "../role/role.schema";

export const permission = pgTable("permission", {
  id: uuid("id").defaultRandom().primaryKey(),
  roleId: uuid("role_id").notNull().references(() => role.id, { onDelete: 'cascade' }),
  resource: varchar("resource", { length: 255 }).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  ...timestamps,
});

export type Permission = typeof permission.$inferSelect;
export type NewPermission = typeof permission.$inferInsert;
