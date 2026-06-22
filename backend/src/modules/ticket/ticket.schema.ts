import { pgTable, uuid, varchar, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";
import { mailbox } from "../mailbox/mailbox.schema";
import { user } from "../user/user.schema";
import { contact } from "../contact/contact.schema";
import { department } from "../department/department.schema";
import { sla } from "../sla/sla.schema";

export const ticket = pgTable("ticket", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: 'cascade' }),
  mailboxId: uuid("mailbox_id").notNull().references(() => mailbox.id),
  requesterId: uuid("requester_id").references(() => user.id),
  contactId: uuid("contact_id").references(() => contact.id),
  assigneeId: uuid("assignee_id").references(() => user.id),
  departmentId: uuid("department_id").references(() => department.id),
  slaId: uuid("sla_id").references(() => sla.id),
  subject: varchar("subject", { length: 1024 }).notNull(),
  // Channel the ticket originated from: email | portal | api. Set at creation.
  source: varchar("source", { length: 20 }).default("portal").notNull(),
  status: varchar("status", { length: 50 }).default("open").notNull(),
  priority: varchar("priority", { length: 50 }).default("medium").notNull(),

  firstResponseTargetAt: timestamp("first_response_target_at", { withTimezone: true }),
  resolutionTargetAt: timestamp("resolution_target_at", { withTimezone: true }),
  firstResponseMet: boolean("first_response_met").default(false).notNull(),
  resolutionBreached: boolean("resolution_breached").default(false).notNull(),

  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  ccEmails: jsonb("cc_emails").$type<string[]>().default([]),
  ...timestamps,
});

export type Ticket = typeof ticket.$inferSelect;
export type NewTicket = typeof ticket.$inferInsert;
