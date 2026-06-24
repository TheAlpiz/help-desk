import { pgTable, uuid, varchar, text, timestamp, integer, primaryKey } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";
import { user } from "../user/user.schema";

export const conversation = pgTable("conversation", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull().default("direct"),
  name: varchar("name", { length: 255 }),
  ...timestamps,
});

export const conversationParticipant = pgTable(
  "conversation_participant",
  {
    conversationId: uuid("conversation_id").notNull().references(() => conversation.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.conversationId, t.userId] }),
  }),
);

export const chatMessage = pgTable("chat_message", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => conversation.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  // How many attachments the sender announced at send time. Lets recipients show
  // skeleton placeholders until the files finish uploading and are confirmed.
  attachmentCount: integer("attachment_count").default(0).notNull(),
  ...timestamps,
});

export type Conversation = typeof conversation.$inferSelect;
export type ConversationParticipant = typeof conversationParticipant.$inferSelect;
export type ChatMessage = typeof chatMessage.$inferSelect;
