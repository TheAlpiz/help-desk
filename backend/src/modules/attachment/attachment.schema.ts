import { pgTable, uuid, varchar, integer, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";
import { user } from "../user/user.schema";

export const attachment = pgTable("attachment", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: 'cascade' }),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // TICKET_MESSAGE, TASK, EMAIL
  entityId: uuid("entity_id").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storageKey: varchar("storage_key", { length: 512 }).notNull().unique(), // MinIO object path
  uploaderId: uuid("uploader_id").references(() => user.id), // Can be null if system/email
  isSafe: boolean("is_safe"), // null = pending, true = safe, false = infected
  ...timestamps,
});

export type Attachment = typeof attachment.$inferSelect;
export type NewAttachment = typeof attachment.$inferInsert;
