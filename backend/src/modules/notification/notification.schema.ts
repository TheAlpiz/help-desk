import { pgTable, uuid, varchar, text, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { user } from "../user/user.schema";

export const notification = pgTable("notification", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 100 }).notNull(), // e.g. TICKET_ASSIGNED, SLA_VIOLATION
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  actionUrl: varchar("action_url", { length: 1024 }),
  isRead: boolean("is_read").default(false).notNull(),
  ...timestamps,
});

export type Notification = typeof notification.$inferSelect;
export type NewNotification = typeof notification.$inferInsert;
