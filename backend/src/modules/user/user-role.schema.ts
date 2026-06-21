import { pgTable, uuid, unique } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";
import { user } from "./user.schema";
import { role } from "../role/role.schema";

// Many-to-many: users <-> roles (RBAC assignment), tenant scoped.
export const userRole = pgTable(
  "user_role",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => ({
    uniqUserRole: unique("user_role_user_id_role_id_unique").on(t.userId, t.roleId),
  }),
);

export type UserRole = typeof userRole.$inferSelect;
export type NewUserRole = typeof userRole.$inferInsert;
