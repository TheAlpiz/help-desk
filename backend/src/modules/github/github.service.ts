import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { withTenantTransaction, withSuperAdminTransaction } from "../../infra/db";
import { encryptSecret, decryptSecret } from "../../infra/crypto";
import { logger } from "../../infra/logger";
import { task } from "../task/task.schema";
import { user } from "../user/user.schema";
import { auditLog, SYSTEM_ACTOR_ID } from "../audit-log/audit-log.schema";
import {
  githubInstallation,
  taskGithubLink,
  githubEvent,
  GithubInstallation,
} from "./github.schema";
import * as gh from "./github.client";
import {
  nextStatusForEvent,
  GithubTransitionTrigger,
  TASK_STATUS,
} from "./github.constants";

// Refresh the cached installation token when it has under this much life left.
const TOKEN_REFRESH_SKEW_MS = 60_000;

function splitRepo(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) throw new Error(`Invalid repo full name: ${fullName}`);
  return { owner, repo };
}

function generateBranchName(taskId: string): string {
  // Server-generated only — never derived from client input.
  // task/{taskId}/{shortRandomId}
  const shortId = randomBytes(4).toString("hex"); // 8 hex chars
  return `task/${taskId}/${shortId}`;
}

export const GithubService = {
  isConfigured: gh.isGithubConfigured,

  // ─── Installation lifecycle ─────────────────────────────────────────────────

  // All installations a tenant has connected (one per GitHub account).
  listInstallations: (tenantId: string) =>
    withTenantTransaction(tenantId, async (tx) => {
      return tx
        .select()
        .from(githubInstallation)
        .where(eq(githubInstallation.organizationId, tenantId));
    }),

  /**
   * Persist an org → installation mapping after a user installs the App. Multiple
   * installations per org are supported (different users / GitHub accounts); this
   * upserts by installationId so reconnecting the same account updates in place
   * without disturbing the others. The id is verified against GitHub (App JWT)
   * before we trust it, so a client cannot bind an arbitrary installation.
   */
  connectInstallation: async (
    tenantId: string,
    installationId: string,
    connectedByUserId?: string,
  ) => {
    if (!gh.isGithubConfigured()) throw new gh.GithubNotConfiguredError();

    const info = await gh.getInstallation(installationId); // throws if not real

    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx
        .select()
        .from(githubInstallation)
        .where(
          and(
            eq(githubInstallation.organizationId, tenantId),
            eq(githubInstallation.installationId, installationId),
          ),
        )
        .limit(1);

      const values = {
        organizationId: tenantId,
        installationId,
        connectedByUserId: connectedByUserId ?? null,
        accountLogin: info.account?.login ?? null,
        accountType: info.account?.type ?? null,
        suspendedAt: info.suspended_at ? new Date(info.suspended_at) : null,
        // Drop any stale cached token.
        tokenEncrypted: null,
        tokenExpiresAt: null,
      };

      let row: GithubInstallation;
      if (existing[0]) {
        const updated = await tx
          .update(githubInstallation)
          .set(values)
          .where(eq(githubInstallation.id, existing[0].id))
          .returning();
        row = updated[0];
      } else {
        const inserted = await tx
          .insert(githubInstallation)
          .values(values)
          .returning();
        row = inserted[0];
      }

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "github_installation",
        entityId: row.id,
        actorId: connectedByUserId ?? SYSTEM_ACTOR_ID,
        action: "connected",
        newValues: { installationId, accountLogin: row.accountLogin },
      });

      return row;
    });
  },

  /**
   * List every installation of the App (across accounts), for the connect UI to
   * pick from when the redirect didn't include an installation_id.
   */
  listAvailableInstallations: async () => {
    if (!gh.isGithubConfigured()) throw new gh.GithubNotConfiguredError();
    const list = await gh.listAppInstallations();
    return list.map((i) => ({
      installationId: String(i.id),
      accountLogin: i.account?.login ?? null,
      accountType: i.account?.type ?? null,
    }));
  },

  /** Disconnect a single installation by GitHub installation id. */
  disconnect: (tenantId: string, installationId: string, actorId?: string) =>
    withTenantTransaction(tenantId, async (tx) => {
      await tx
        .delete(githubInstallation)
        .where(
          and(
            eq(githubInstallation.organizationId, tenantId),
            eq(githubInstallation.installationId, installationId),
          ),
        );
      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "github_installation",
        entityId: tenantId,
        actorId: actorId ?? SYSTEM_ACTOR_ID,
        action: "disconnected",
        oldValues: { installationId },
      });
      return { ok: true };
    }),

  // ─── Token caching ──────────────────────────────────────────────────────────

  /**
   * Return a valid installation access token, minting + caching a fresh one when
   * the cached token is missing or near expiry. Token is encrypted at rest.
   */
  getValidInstallationToken: async (
    tenantId: string,
    install: GithubInstallation,
  ): Promise<string> => {
    const fresh =
      install.tokenEncrypted &&
      install.tokenExpiresAt &&
      install.tokenExpiresAt.getTime() - Date.now() > TOKEN_REFRESH_SKEW_MS;

    if (fresh) {
      return decryptSecret(install.tokenEncrypted)!;
    }

    const minted = await gh.getInstallationToken(install.installationId);
    await withTenantTransaction(tenantId, async (tx) => {
      await tx
        .update(githubInstallation)
        .set({
          tokenEncrypted: encryptSecret(minted.token),
          tokenExpiresAt: new Date(minted.expires_at),
        })
        .where(eq(githubInstallation.id, install.id));
    });
    return minted.token;
  },

  // ─── Repos ──────────────────────────────────────────────────────────────────

  // Aggregate repos across every connected installation (all GitHub accounts the
  // org has linked). Each repo is tagged with its owning installation/account so
  // the picker can group and the link step knows which token to use.
  listRepos: async (tenantId: string) => {
    const installs = (await GithubService.listInstallations(tenantId)).filter(
      (i) => !i.suspendedAt,
    );
    const out: Array<{
      id: number;
      fullName: string;
      defaultBranch: string;
      private: boolean;
      htmlUrl: string;
      accountLogin: string | null;
      installationId: string;
    }> = [];

    for (const install of installs) {
      try {
        const token = await GithubService.getValidInstallationToken(tenantId, install);
        const repos = await gh.listInstallationRepos(token);
        for (const r of repos) {
          out.push({
            id: r.id,
            fullName: r.full_name,
            defaultBranch: r.default_branch,
            private: r.private,
            htmlUrl: r.html_url,
            accountLogin: install.accountLogin,
            installationId: install.installationId,
          });
        }
      } catch (err) {
        logger.warn(
          { err, installationId: install.installationId },
          "[github] failed listing repos for installation",
        );
      }
    }

    // De-dup by repo id (a repo can only belong to one installation, but guard).
    const seen = new Set<number>();
    return out.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  },

  // Pick the connected installation that can access `owner/repo`: prefer the one
  // whose account login matches the repo owner, else probe each for access.
  findInstallationForRepo: async (
    tenantId: string,
    repoFullName: string,
  ): Promise<GithubInstallation | null> => {
    const installs = (await GithubService.listInstallations(tenantId)).filter(
      (i) => !i.suspendedAt,
    );
    if (installs.length === 0) return null;
    const { owner, repo } = splitRepo(repoFullName);

    const byOwner = installs.find(
      (i) => i.accountLogin?.toLowerCase() === owner.toLowerCase(),
    );
    if (byOwner) return byOwner;

    for (const cand of installs) {
      try {
        const tk = await GithubService.getValidInstallationToken(tenantId, cand);
        await gh.getRepo(tk, owner, repo);
        return cand;
      } catch {
        /* this installation can't see it — try the next */
      }
    }
    return null;
  },

  /**
   * Help-desk users assignable to a task on `repoFullName`: the intersection of
   * the repo's GitHub collaborators with tenant users whose GitHub login is known
   * (explicit `githubLogin`, or the account login of an installation they connected).
   */
  getAssignableUsers: async (tenantId: string, repoFullName: string) => {
    const install = await GithubService.findInstallationForRepo(tenantId, repoFullName);
    if (!install) return [];
    const token = await GithubService.getValidInstallationToken(tenantId, install);
    const { owner, repo } = splitRepo(repoFullName);

    const collaborators = await gh.listRepoCollaborators(token, owner, repo);
    const collabLogins = new Set(collaborators.map((c) => c.login.toLowerCase()));

    return withTenantTransaction(tenantId, async (tx) => {
      const users = await tx
        .select({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          githubLogin: user.githubLogin,
        })
        .from(user)
        .where(eq(user.organizationId, tenantId));

      // Map userId → GitHub login derived from their own installation.
      const installs = await tx
        .select({
          uid: githubInstallation.connectedByUserId,
          login: githubInstallation.accountLogin,
        })
        .from(githubInstallation)
        .where(eq(githubInstallation.organizationId, tenantId));
      const installLoginByUser = new Map<string, string>();
      for (const i of installs) {
        if (i.uid && i.login) installLoginByUser.set(i.uid, i.login.toLowerCase());
      }

      return users
        .filter((u) => {
          const login = (u.githubLogin ?? installLoginByUser.get(u.id) ?? "").toLowerCase();
          return login !== "" && collabLogins.has(login);
        })
        .map((u) => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
        }));
    });
  },

  // ─── Task ↔ branch linking ──────────────────────────────────────────────────

  getTaskLink: (tenantId: string, taskId: string) =>
    withTenantTransaction(tenantId, async (tx) => {
      const rows = await tx
        .select()
        .from(taskGithubLink)
        .where(eq(taskGithubLink.taskId, taskId))
        .limit(1);
      return rows[0] ?? null;
    }),

  unlinkTask: (tenantId: string, taskId: string) =>
    withTenantTransaction(tenantId, async (tx) => {
      await tx.delete(taskGithubLink).where(eq(taskGithubLink.taskId, taskId));
      return { ok: true };
    }),

  /**
   * Create the GitHub branch (and a draft PR) for a task and persist the mapping.
   * Runs in the github-link worker — it performs several network round-trips and
   * must never sit inside an HTTP route. Idempotent per task: a second call for an
   * already-linked task is a no-op.
   */
  createLinkForTask: async (
    tenantId: string,
    taskId: string,
    repoFullName: string,
  ) => {
    // Already linked? Nothing to do.
    const existing = await GithubService.getTaskLink(tenantId, taskId);
    if (existing) return existing;

    const install = await GithubService.findInstallationForRepo(tenantId, repoFullName);
    if (!install) {
      throw new Error(
        `No connected GitHub installation has access to ${repoFullName}.`,
      );
    }

    // Load the task (validates tenant ownership + gives a title for the PR).
    const t = await withTenantTransaction(tenantId, async (tx) => {
      const rows = await tx
        .select()
        .from(task)
        .where(and(eq(task.id, taskId), eq(task.organizationId, tenantId)))
        .limit(1);
      return rows[0];
    });
    if (!t) throw new Error("Task not found.");

    const token = await GithubService.getValidInstallationToken(tenantId, install);
    const { owner, repo } = splitRepo(repoFullName);

    // Resolve repo (default branch + numeric id) then its base SHA.
    const repoInfo = await gh.getRepo(token, owner, repo);
    const baseBranch = repoInfo.default_branch;
    const baseRef = await gh.getBranchRef(token, owner, repo, baseBranch);
    const baseSha = baseRef.object.sha;

    const branchName = generateBranchName(taskId);
    await gh.createBranch(token, owner, repo, branchName, baseSha);
    const branchUrl = `${repoInfo.html_url}/tree/${branchName}`;

    // Extras: open a draft PR linking the work back to the task.
    let prNumber: number | null = null;
    let prUrl: string | null = null;
    try {
      const pr = await gh.createPullRequest(token, owner, repo, {
        title: `${t.title} (task #${taskId})`,
        head: branchName,
        base: baseBranch,
        body: `Linked to help-desk task \`${taskId}\`.`,
        draft: true,
      });
      prNumber = pr.number;
      prUrl = pr.html_url;
    } catch (err) {
      // A draft PR can fail (e.g. empty branch / repo settings). Branch link still
      // valid; surface but don't abort.
      logger.warn({ err, taskId }, "[github] draft PR creation failed");
    }

    return withTenantTransaction(tenantId, async (tx) => {
      const inserted = await tx
        .insert(taskGithubLink)
        .values({
          taskId,
          installationId: install.id,
          repoFullName,
          repoId: repoInfo.id,
          branchName,
          baseBranch,
          baseSha,
          branchUrl,
          prNumber,
          prUrl,
        })
        .returning();

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "task",
        entityId: taskId,
        actorId: SYSTEM_ACTOR_ID,
        action: "github_linked",
        newValues: { repoFullName, branchName, prNumber },
      });

      return inserted[0];
    });
  },

  // ─── Webhook-driven state transitions (super-admin / cross-tenant) ───────────

  /**
   * Resolve a (repoId, branchName) to its task link and apply the forward-only
   * status transition for the given trigger. Returns a short result for logging.
   * Safe when no link exists (task deleted / unknown branch) — returns "ignored".
   *
   * `linkRowId` is recorded on the github_event for traceability by the caller.
   */
  applyGithubTransition: async (
    repoId: number,
    branchName: string,
    trigger: GithubTransitionTrigger,
  ): Promise<{ status: string; taskId?: string; linkId?: string; orgId?: string }> => {
    return withSuperAdminTransaction(async (tx) => {
      const linkRows = await tx
        .select()
        .from(taskGithubLink)
        .where(
          and(
            eq(taskGithubLink.repoId, repoId),
            eq(taskGithubLink.branchName, branchName),
          ),
        )
        .limit(1);
      const link = linkRows[0];
      if (!link) return { status: "ignored" };

      const taskRows = await tx
        .select()
        .from(task)
        .where(eq(task.id, link.taskId))
        .limit(1);
      const t = taskRows[0];
      // Task deleted — link should have cascaded, but guard anyway.
      if (!t) return { status: "ignored", linkId: link.id };

      // Stamp the link's activity regardless of whether status moves.
      await tx
        .update(taskGithubLink)
        .set({ lastEventAt: new Date() })
        .where(eq(taskGithubLink.id, link.id));

      const target = nextStatusForEvent(t.status, trigger);
      if (!target) {
        return {
          status: "no_transition",
          taskId: t.id,
          linkId: link.id,
          orgId: t.organizationId,
        };
      }

      const isTerminal = target === TASK_STATUS.DONE;
      await tx
        .update(task)
        .set({ status: target, completedAt: isTerminal ? new Date() : null })
        .where(eq(task.id, t.id));

      await tx.insert(auditLog).values({
        organizationId: t.organizationId,
        entityType: "task",
        entityId: t.id,
        actorId: SYSTEM_ACTOR_ID,
        action: "status_changed",
        oldValues: { status: t.status },
        newValues: { status: target, source: "github", trigger },
      });

      return {
        status: "transitioned",
        taskId: t.id,
        linkId: link.id,
        orgId: t.organizationId,
      };
    });
  },

  /**
   * Flip an installation's suspended flag in response to an `installation`
   * webhook (suspend / unsuspend / deleted). Matched by GitHub installation id;
   * cross-tenant, so runs under the super-admin context.
   */
  setInstallationSuspended: (installationId: string, suspended: boolean) =>
    withSuperAdminTransaction(async (tx) => {
      await tx
        .update(githubInstallation)
        .set({ suspendedAt: suspended ? new Date() : null })
        .where(eq(githubInstallation.installationId, installationId));
      return { ok: true };
    }),

  /**
   * Idempotency gate for webhook deliveries. Inserts the delivery row; returns
   * false if it already existed (i.e. this delivery was already processed).
   */
  recordDelivery: async (params: {
    deliveryId: string;
    eventType: string;
    action: string | null;
    organizationId?: string | null;
    taskGithubLinkId?: string | null;
    payload: unknown;
  }): Promise<boolean> => {
    return withSuperAdminTransaction(async (tx) => {
      const inserted = await tx
        .insert(githubEvent)
        .values({
          deliveryId: params.deliveryId,
          eventType: params.eventType,
          action: params.action,
          organizationId: params.organizationId ?? null,
          taskGithubLinkId: params.taskGithubLinkId ?? null,
          payloadJson: params.payload as object,
        })
        .onConflictDoNothing({ target: githubEvent.deliveryId })
        .returning({ id: githubEvent.id });
      return inserted.length > 0;
    });
  },
};
