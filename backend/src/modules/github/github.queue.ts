import { Queue } from "bullmq";
import { env } from "../../infra/env";
import { GITHUB_LINK_QUEUE, GITHUB_SYNC_QUEUE } from "./github.constants";

const connection = { url: env.REDIS_URL };

// Producer-side queue handles. The GithubWorker (workers/github.worker.ts) consumes them.
export const githubLinkQueue = new Queue(GITHUB_LINK_QUEUE, { connection });
export const githubSyncQueue = new Queue(GITHUB_SYNC_QUEUE, { connection });

export interface GithubLinkJob {
  tenantId: string;
  taskId: string;
  repoFullName: string;
}

export interface GithubSyncJob {
  deliveryId: string;
  eventType: string;
  // Parsed webhook payload.
  payload: any;
}

// Retry transient GitHub/network failures with backoff; drop the job after the cap.
const linkJobOpts = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 5_000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};

const syncJobOpts = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2_000 },
  removeOnComplete: 200,
  removeOnFail: 1000,
};

export function enqueueGithubLink(job: GithubLinkJob) {
  return githubLinkQueue.add("link", job, linkJobOpts);
}

export function enqueueGithubSync(job: GithubSyncJob) {
  // De-dupe on delivery id at the queue layer too (cheap first line of defense;
  // the DB unique index on delivery_id is the authoritative idempotency gate).
  return githubSyncQueue.add("sync", job, { ...syncJobOpts, jobId: job.deliveryId });
}
