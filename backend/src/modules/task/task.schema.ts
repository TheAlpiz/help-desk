import { pgTable, uuid, varchar, text, timestamp, AnyPgColumn } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";
import { ticket } from "../ticket/ticket.schema";
import { user } from "../user/user.schema";

export const task = pgTable("task", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: 'cascade' }),
  ticketId: uuid("ticket_id").references(() => ticket.id, { onDelete: 'cascade' }),
  parentTaskId: uuid("parent_task_id").references((): AnyPgColumn => task.id, { onDelete: 'cascade' }),
  creatorId: uuid("creator_id").notNull().references(() => user.id),
  assigneeId: uuid("assignee_id").references(() => user.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("TODO").notNull(),
  priority: varchar("priority", { length: 50 }).default("MEDIUM").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  // Set when the task transitions into a terminal status (DONE/CANCELED),
  // cleared if it is reopened. Drives the "completed today" daily view.
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps,
});

export type Task = typeof task.$inferSelect;
export type NewTask = typeof task.$inferInsert;
