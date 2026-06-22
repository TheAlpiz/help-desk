import { pgTable, uuid, varchar, text, boolean, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";
import { user } from "../user/user.schema";

export const emailBranding = pgTable("email_branding", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: 'cascade' }),
  // Colors
  primaryColor: varchar("primary_color", { length: 7 }).default("#2563eb").notNull(),
  secondaryColor: varchar("secondary_color", { length: 7 }).default("#64748b").notNull(),
  // Header
  logoUrl: text("logo_url"),
  headerBgColor: varchar("header_bg_color", { length: 7 }).default("#ffffff").notNull(),
  // Body / Font
  fontFamily: varchar("font_family", { length: 100 }).default("Inter, sans-serif").notNull(),
  // Button
  buttonColor: varchar("button_color", { length: 7 }),
  buttonBorderRadius: integer("button_border_radius").default(6).notNull(),
  // Footer
  footerText: text("footer_text"),
  footerBgColor: varchar("footer_bg_color", { length: 7 }).default("#f8fafc").notNull(),
  // Company info shown in footer
  companyAddress: text("company_address"),
  companyPhone: varchar("company_phone", { length: 50 }),
  unsubscribeText: text("unsubscribe_text"),
  // Social links: [{ platform, url }]
  socialLinks: jsonb("social_links").$type<{ platform: string; url: string }[]>().default([]).notNull(),
  // Misc
  darkModeEnabled: boolean("dark_mode_enabled").default(false).notNull(),
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

// ── Analytics tracking ────────────────────────────────────────────────────────

export const emailSend = pgTable(
  "email_sends",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    trackingId: uuid("tracking_id").defaultRandom().notNull().unique(),
    ticketId: uuid("ticket_id"),
    mailboxId: uuid("mailbox_id"),
    recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
    templateType: varchar("template_type", { length: 50 }),
    subject: text("subject"),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    openCount: integer("open_count").default(0).notNull(),
    clickCount: integer("click_count").default(0).notNull(),
    lastClickedAt: timestamp("last_clicked_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_email_sends_org").on(t.organizationId),
    index("idx_email_sends_ticket").on(t.ticketId),
    index("idx_email_sends_tracking").on(t.trackingId),
  ],
);

export const emailClickEvent = pgTable(
  "email_click_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sendId: uuid("send_id").notNull().references(() => emailSend.id, { onDelete: "cascade" }),
    originalUrl: text("original_url").notNull(),
    clickedAt: timestamp("clicked_at", { withTimezone: true }).defaultNow().notNull(),
    userAgent: text("user_agent"),
    ipHash: varchar("ip_hash", { length: 64 }),
  },
  (t) => [index("idx_email_click_send").on(t.sendId)],
);

export type EmailSend = typeof emailSend.$inferSelect;
export type EmailClickEvent = typeof emailClickEvent.$inferSelect;

// ── Approval workflows ────────────────────────────────────────────────────────

export const templateApproval = pgTable(
  "template_approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    templateVersionId: uuid("template_version_id").notNull().references(() => templateVersion.id, { onDelete: "cascade" }),
    requestedById: uuid("requested_by_id").notNull().references(() => user.id),
    reviewedById: uuid("reviewed_by_id").references(() => user.id),
    status: varchar("status", { length: 20 }).default("PENDING").notNull(), // PENDING, APPROVED, REJECTED
    notes: text("notes"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("idx_template_approval_version").on(t.templateVersionId)],
);

export type TemplateApproval = typeof templateApproval.$inferSelect;

// ── Signature rules ───────────────────────────────────────────────────────────

// Condition: { field: "mailboxId"|"ticketPriority"|"departmentId", op: "eq"|"in", value: string|string[] }
export const signatureRule = pgTable(
  "signature_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    priority: integer("priority").default(0).notNull(),
    conditions: jsonb("conditions").$type<Array<{ field: string; op: string; value: string | string[] }>>().notNull(),
    signatureId: uuid("signature_id").notNull().references(() => emailSignature.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (t) => [index("idx_signature_rules_org").on(t.organizationId)],
);

export type SignatureRule = typeof signatureRule.$inferSelect;
export type NewSignatureRule = typeof signatureRule.$inferInsert;
