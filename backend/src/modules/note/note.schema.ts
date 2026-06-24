import { pgTable, uuid, varchar, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";
import { user } from "../user/user.schema";

// Private personal note. Owned by exactly one user (`userId`); only the owner may
// read or mutate it (enforced in the service). Tenant isolation via RLS on
// organization_id. Optional reminder fires an in-app notification.
export const userNote = pgTable(
  "user_note",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }),
    content: text("content").default("").notNull(),
    reminderAt: timestamp("reminder_at", { withTimezone: true }),
    reminderFired: boolean("reminder_fired").default(false).notNull(),
    ...timestamps,
  },
  (t) => ({
    ownerIdx: index("user_note_user_idx").on(t.userId),
    orgIdx: index("user_note_org_idx").on(t.organizationId),
  }),
);

export type UserNote = typeof userNote.$inferSelect;
export type NewUserNote = typeof userNote.$inferInsert;
