import { pgTable, uuid, varchar, text } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { ticket } from "./ticket.schema";
import { user } from "../user/user.schema";
import { contact } from "../contact/contact.schema";

export const ticketMessage = pgTable("ticket_message", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id").notNull().references(() => ticket.id, { onDelete: 'cascade' }),
  senderId: uuid("sender_id").references(() => user.id),
  contactId: uuid("contact_id").references(() => contact.id),
  content: text("content").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("PUBLIC_REPLY"),
  emailMessageId: varchar("email_message_id", { length: 512 }),
  ...timestamps,
});

export type TicketMessage = typeof ticketMessage.$inferSelect;
export type NewTicketMessage = typeof ticketMessage.$inferInsert;
