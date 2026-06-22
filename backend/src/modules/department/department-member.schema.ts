import { pgTable, uuid, unique } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";
import { department } from "./department.schema";
import { user } from "../user/user.schema";

// Many-to-many department membership. A user may belong to multiple departments;
// a department has many members. Replaces the single user.departmentId link.
export const departmentMember = pgTable(
  "department_member",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => department.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => ({
    uniqMembership: unique("department_member_dept_user_uniq").on(t.departmentId, t.userId),
  }),
);

export type DepartmentMember = typeof departmentMember.$inferSelect;
export type NewDepartmentMember = typeof departmentMember.$inferInsert;
