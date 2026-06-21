import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { task } from "./task.schema";
import { user } from "../user/user.schema";

export const taskComment = pgTable("task_comment", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => task.id, { onDelete: 'cascade' }),
  authorId: uuid("author_id").notNull().references(() => user.id),
  content: text("content").notNull(),
  ...timestamps,
});

export type TaskComment = typeof taskComment.$inferSelect;
export type NewTaskComment = typeof taskComment.$inferInsert;
