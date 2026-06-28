import { pgTable, uuid, varchar, timestamp, AnyPgColumn, boolean } from "drizzle-orm/pg-core";
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
  // Discord-style self-set availability. Drives ticket auto-assignment weighting
  // (see assignment.service). One of @help-desk/shared AVAILABILITY_STATUSES.
  availability: varchar("availability", { length: 30 }).default("available").notNull(),
  globalRole: varchar("global_role", { length: 50 }).default("REQUESTER").notNull(),
  // ABAC: department membership used for department-scoped ticket visibility.
  departmentId: uuid("department_id").references((): AnyPgColumn => department.id, { onDelete: "set null" }),
  // Language preference — ISO 639-1 code (e.g. "en", "tr"). Null = browser default.
  preferredLanguage: varchar("preferred_language", { length: 10 }),
  // GitHub username, for mapping this user to repo collaborators (task assignee
  // gating). Auto-derivable from a user's own App install; this field lets a
  // collaborator who never installed still be matched. Case-insensitive on compare.
  githubLogin: varchar("github_login", { length: 100 }),
  // Email verification lifecycle.
  emailVerifiedAt: timestamp("email_verified_at"),
  lastLoginAt: timestamp("last_login_at"),
  forcePasswordChange: boolean("force_password_change").default(false).notNull(),
  ...timestamps,
});

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
