import { pgTable, uuid, varchar, jsonb } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { user } from "../user/user.schema";

export const notificationPreference = pgTable("notification_preference", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
  channel: varchar("channel", { length: 50 }).notNull(), // IN_APP, EMAIL, SMS, PUSH
  eventTypes: jsonb("event_types").notNull(), // Array of strings like ["ticket.assigned", "sla.violation"]
  ...timestamps,
});

export type NotificationPreference = typeof notificationPreference.$inferSelect;
export type NewNotificationPreference = typeof notificationPreference.$inferInsert;
