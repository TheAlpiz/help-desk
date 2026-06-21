import { pgTable, uuid, varchar, timestamp, AnyPgColumn } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";
import { department } from "../department/department.schema";

export const user = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: 'cascade' }),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  globalRole: varchar("global_role", { length: 50 }).default("REQUESTER").notNull(),
  // ABAC: department membership used for department-scoped ticket visibility.
  departmentId: uuid("department_id").references((): AnyPgColumn => department.id, { onDelete: "set null" }),
  // Email verification lifecycle.
  emailVerifiedAt: timestamp("email_verified_at"),
  lastLoginAt: timestamp("last_login_at"),
  ...timestamps,
});

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
