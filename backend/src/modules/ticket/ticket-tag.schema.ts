import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { ticket } from "./ticket.schema";

export const ticketTag = pgTable("ticket_tag", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id").notNull().references(() => ticket.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 50 }).notNull(),
  ...timestamps,
});

export type TicketTag = typeof ticketTag.$inferSelect;
export type NewTicketTag = typeof ticketTag.$inferInsert;
