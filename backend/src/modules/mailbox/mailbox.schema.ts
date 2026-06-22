import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";

export const mailbox = pgTable("mailbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  emailAddress: varchar("email_address", { length: 255 }).notNull(),
  imapHost: varchar("imap_host", { length: 255 }),
  imapPort: integer("imap_port"),
  imapUser: varchar("imap_user", { length: 255 }),
  imapPasswordEncrypted: text("imap_password_encrypted"),
  imapSecure: boolean("imap_secure").default(true).notNull(),
  smtpHost: varchar("smtp_host", { length: 255 }),
  smtpPort: integer("smtp_port"),
  smtpUser: varchar("smtp_user", { length: 255 }),
  smtpPasswordEncrypted: text("smtp_password_encrypted"),
  smtpSecure: boolean("smtp_secure").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  ...timestamps,
});

export type Mailbox = typeof mailbox.$inferSelect;
export type NewMailbox = typeof mailbox.$inferInsert;
