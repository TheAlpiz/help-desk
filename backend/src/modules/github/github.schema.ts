import {
  pgTable,
  uuid,
  varchar,
  text,
  bigint,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { timestamps } from "../../infra/db/schema-utils";
import { organization } from "../organization/organization.schema";
import { task } from "../task/task.schema";

/**
 * A GitHub App installation owned by a tenant organization.
 *
 * One row per (organization, GitHub installation). The short-lived installation
 * access token is cached encrypted at rest (AES-256-GCM via infra/crypto) and
 * refreshed lazily when it nears expiry.
 */
export const githubInstallation = pgTable(
  "github_installation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // GitHub's numeric installation id. Stored as varchar to avoid bigint edge cases
    // and because we only ever compare/equality-match it.
    installationId: varchar("installation_id", { length: 64 }).notNull(),
    accountLogin: varchar("account_login", { length: 255 }),
    accountType: varchar("account_type", { length: 32 }),
    // Cached installation token (enc:v1:... ciphertext) + its absolute expiry.
    tokenEncrypted: text("token_encrypted"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    // Set when GitHub reports the installation suspended/deleted; feature goes inert.
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("github_installation_org_idx").on(t.organizationId),
    uniqueIndex("github_installation_installation_id_uq").on(t.installationId),
  ],
);

/**
 * 1:1 mapping between a task and a GitHub branch (and optional PR).
 *
 * Webhook lookups key on (repoId, branchName) — both indexed — so a push or PR
 * event resolves to its task with a single indexed query. Branch names are always
 * server-generated; never trusted from client input.
 */
export const taskGithubLink = pgTable(
  "task_github_link",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    installationId: uuid("installation_id")
      .notNull()
      .references((): AnyPgColumn => githubInstallation.id, { onDelete: "cascade" }),
    repoFullName: varchar("repo_full_name", { length: 255 }).notNull(),
    // GitHub numeric repo id — used to reject fork PRs (head.repo.id must match).
    repoId: bigint("repo_id", { mode: "number" }).notNull(),
    branchName: varchar("branch_name", { length: 255 }).notNull(),
    baseBranch: varchar("base_branch", { length: 255 }),
    baseSha: varchar("base_sha", { length: 64 }),
    branchUrl: text("branch_url"),
    prNumber: integer("pr_number"),
    prUrl: text("pr_url"),
    lastEventAt: timestamp("last_event_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("task_github_link_task_id_uq").on(t.taskId),
    index("task_github_link_branch_idx").on(t.repoId, t.branchName),
  ],
);

/**
 * Append-only log of received webhook deliveries. The unique deliveryId
 * (GitHub `X-GitHub-Delivery`) is the idempotency key: a redelivered event is
 * inserted with onConflictDoNothing and skipped, so state transitions fire once.
 */
export const githubEvent = pgTable(
  "github_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    deliveryId: varchar("delivery_id", { length: 128 }).notNull(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    action: varchar("action", { length: 64 }),
    taskGithubLinkId: uuid("task_github_link_id").references(
      (): AnyPgColumn => taskGithubLink.id,
      { onDelete: "set null" },
    ),
    payloadJson: jsonb("payload_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("github_event_delivery_id_uq").on(t.deliveryId),
    index("github_event_org_idx").on(t.organizationId),
  ],
);

export type GithubInstallation = typeof githubInstallation.$inferSelect;
export type NewGithubInstallation = typeof githubInstallation.$inferInsert;
export type TaskGithubLink = typeof taskGithubLink.$inferSelect;
export type NewTaskGithubLink = typeof taskGithubLink.$inferInsert;
export type GithubEvent = typeof githubEvent.$inferSelect;
export type NewGithubEvent = typeof githubEvent.$inferInsert;
