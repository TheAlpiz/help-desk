import { Worker, Job } from "bullmq";
import { env } from "../infra/env";
import { logger } from "../infra/logger";
import { GithubService } from "../modules/github/github.service";
import {
  GITHUB_LINK_QUEUE,
  GITHUB_SYNC_QUEUE,
} from "../modules/github/github.constants";
import type {
  GithubLinkJob,
  GithubSyncJob,
} from "../modules/github/github.queue";

/**
 * Consumes the two GitHub queues:
 *   - github-link : create the branch (+ draft PR) for a task and persist the link.
 *   - github-sync : process verified webhook deliveries and drive task status.
 *
 * Webhook signature verification + rate limiting already happened at the HTTP edge
 * (github.route.ts). This worker only sees deliveries that passed HMAC.
 */
export class GithubWorker {
  private workers: Worker[] = [];

  constructor() {
    const connection = { url: env.REDIS_URL };

    this.workers.push(
      new Worker<GithubLinkJob>(
        GITHUB_LINK_QUEUE,
        (job) => this.processLink(job),
        { connection },
      ),
    );

    this.workers.push(
      new Worker<GithubSyncJob>(
        GITHUB_SYNC_QUEUE,
        (job) => this.processSync(job),
        { connection },
      ),
    );

    for (const w of this.workers) {
      w.on("failed", (job, err) =>
        logger.error({ err, jobId: job?.id, queue: w.name }, "[github] job failed"),
      );
    }
    logger.info("[github] worker started (github-link, github-sync)");
  }

  private async processLink(job: Job<GithubLinkJob>) {
    const { tenantId, taskId, repoFullName } = job.data;
    const link = await GithubService.createLinkForTask(
      tenantId,
      taskId,
      repoFullName,
    );
    logger.info(
      { taskId, branch: link.branchName, repo: repoFullName },
      "[github] branch created for task",
    );
  }

  private async processSync(job: Job<GithubSyncJob>) {
    const { deliveryId, eventType, payload } = job.data;

    // Resolve the action for logging/storage before the idempotency insert.
    const action: string | null = payload?.action ?? null;

    // Authoritative idempotency gate: a redelivered X-GitHub-Delivery is skipped.
    const isNew = await GithubService.recordDelivery({
      deliveryId,
      eventType,
      action,
      payload,
    });
    if (!isNew) {
      logger.debug({ deliveryId, eventType }, "[github] duplicate delivery skipped");
      return;
    }

    switch (eventType) {
      case "push":
        await this.handlePush(payload);
        break;
      case "pull_request":
        await this.handlePullRequest(payload);
        break;
      case "installation":
      case "installation_repositories":
        await this.handleInstallation(payload);
        break;
      default:
        logger.debug({ eventType }, "[github] unhandled event type");
    }
  }

  private async handlePush(payload: any) {
    const ref: string | undefined = payload?.ref;
    const repoId: number | undefined = payload?.repository?.id;
    // Branch refs only (ignore tag pushes); skip branch-delete pushes.
    if (!ref?.startsWith("refs/heads/") || !repoId || payload?.deleted) return;

    const branch = ref.slice("refs/heads/".length);
    const result = await GithubService.applyGithubTransition(repoId, branch, "push");
    logger.info({ branch, repoId, result }, "[github] push processed");
  }

  private async handlePullRequest(payload: any) {
    const action: string = payload?.action;
    const pr = payload?.pull_request;
    const baseRepoId: number | undefined = payload?.repository?.id;
    if (!pr || !baseRepoId) return;

    // Only completion matters: a merged, closed PR. Reopened PRs never revert status.
    if (action !== "closed" || pr.merged !== true) return;

    // Reject fork PRs — the head must live in the same installation-owned repo.
    const headRepoId: number | undefined = pr.head?.repo?.id;
    if (!headRepoId || headRepoId !== baseRepoId) {
      logger.debug({ baseRepoId, headRepoId }, "[github] ignoring fork PR");
      return;
    }

    const branch: string = pr.head?.ref;
    if (!branch) return;

    const result = await GithubService.applyGithubTransition(
      baseRepoId,
      branch,
      "pr_merged",
    );
    logger.info({ branch, repoId: baseRepoId, result }, "[github] PR merge processed");
  }

  private async handleInstallation(payload: any) {
    const action: string = payload?.action;
    const installationId: string | undefined = payload?.installation?.id?.toString();
    if (!installationId) return;

    if (action === "suspend" || action === "deleted") {
      await GithubService.setInstallationSuspended(installationId, true);
    } else if (action === "unsuspend") {
      await GithubService.setInstallationSuspended(installationId, false);
    }
    logger.info({ installationId, action }, "[github] installation event processed");
  }
}
