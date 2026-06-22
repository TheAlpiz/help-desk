import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";
import { user } from "../user/user.schema";

// Refresh-token sessions. Enables rotation and revocation (single + all).
// Only the SHA-256 hash of the refresh token is stored, never the token itself.
export const session = pgTable("session", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  // Rotation chain: when this token is rotated, points at the hash of its successor.
  // If a token that has already been rotated is presented again, that is a replay →
  // we revoke the whole chain (reuse detection).
  rotatedToTokenHash: varchar("rotated_to_token_hash", { length: 64 }),
  reuseDetectedAt: timestamp("reuse_detected_at", { withTimezone: true }),
  userAgent: varchar("user_agent", { length: 512 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
});

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
