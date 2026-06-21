import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { ticket } from "./ticket.schema";

export const ticketLink = pgTable("ticket_link", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceTicketId: uuid("source_ticket_id").notNull().references(() => ticket.id, { onDelete: 'cascade' }),
  targetTicketId: uuid("target_ticket_id").notNull().references(() => ticket.id, { onDelete: 'cascade' }),
  linkType: varchar("link_type", { length: 50 }).notNull(), // e.g. MERGED_INTO, RELATES_TO, BLOCKS
  ...timestamps,
});

export type TicketLink = typeof ticketLink.$inferSelect;
export type NewTicketLink = typeof ticketLink.$inferInsert;
