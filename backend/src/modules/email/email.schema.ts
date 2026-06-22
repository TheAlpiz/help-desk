import { pgTable, uuid, varchar, text, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";
import { user } from "../user/user.schema";

export const emailBranding = pgTable("email_branding", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: 'cascade' }),
  primaryColor: varchar("primary_color", { length: 7 }).default("#2563eb").notNull(),
  fontFamily: varchar("font_family", { length: 100 }).default("Inter, sans-serif").notNull(),
  logoUrl: text("logo_url"),
  removeHelpdeskBranding: boolean("remove_helpdesk_branding").default(false).notNull(),
  ...timestamps,
});

export const emailTemplate = pgTable("email_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: 'cascade' }),
  templateType: varchar("template_type", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  language: varchar("language", { length: 10 }).default("en").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
});

export const templateVersion = pgTable("template_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id").notNull().references(() => emailTemplate.id, { onDelete: 'cascade' }),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyPlain: text("body_plain").notNull(),
  contentJson: jsonb("content_json"),
  versionNumber: integer("version_number").notNull(),
  status: varchar("status", { length: 20 }).default("DRAFT").notNull(), // DRAFT, PUBLISHED, ARCHIVED
  createdById: uuid("created_by_id").references(() => user.id),
  ...timestamps,
});

export const emailSignature = pgTable("email_signatures", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: 'cascade' }),
  ownerType: varchar("owner_type", { length: 20 }).notNull(), // ORGANIZATION, DEPARTMENT, AGENT
  ownerId: uuid("owner_id").notNull(), // organizationId, departmentId, or userId
  name: varchar("name", { length: 255 }).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  ...timestamps,
});

export const signatureVersion = pgTable("signature_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  signatureId: uuid("signature_id").notNull().references(() => emailSignature.id, { onDelete: 'cascade' }),
  contentHtml: text("content_html").notNull(),
  contentPlain: text("content_plain"),
  contentJson: jsonb("content_json"),
  versionNumber: integer("version_number").notNull(),
  status: varchar("status", { length: 20 }).default("PUBLISHED").notNull(),
  ...timestamps,
});

export type EmailBranding = typeof emailBranding.$inferSelect;
export type NewEmailBranding = typeof emailBranding.$inferInsert;

export type EmailTemplate = typeof emailTemplate.$inferSelect;
export type NewEmailTemplate = typeof emailTemplate.$inferInsert;

export type TemplateVersion = typeof templateVersion.$inferSelect;
export type NewTemplateVersion = typeof templateVersion.$inferInsert;

export type EmailSignature = typeof emailSignature.$inferSelect;
export type NewEmailSignature = typeof emailSignature.$inferInsert;

export type SignatureVersion = typeof signatureVersion.$inferSelect;
export type NewSignatureVersion = typeof signatureVersion.$inferInsert;
