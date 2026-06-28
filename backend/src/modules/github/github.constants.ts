// GitHub → Task status state machine.
//
// Canonical task statuses already used across the app: TODO → IN_PROGRESS → DONE
// (plus CANCELED, which is terminal and never touched by GitHub sync).
//
//   branch created      → TODO (unchanged)
//   first push to branch → IN_PROGRESS
//   PR merged            → DONE
//
// Transitions are strictly forward and idempotent: re-applying the same event is a
// no-op, and we never move a task *backwards* (e.g. a reopened PR must not revert DONE).

export const TASK_STATUS = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
  CANCELED: "CANCELED",
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export type GithubTransitionTrigger = "push" | "pr_merged";

// Statuses GitHub sync must never overwrite (human-terminal / off-track).
const FROZEN = new Set<string>([TASK_STATUS.DONE, TASK_STATUS.CANCELED]);

/**
 * Given the task's current status and a GitHub trigger, return the status to move
 * to — or `null` when the event should be ignored.
 *
 *   push      : only a fresh TODO advances to IN_PROGRESS. Any further-along task
 *               (IN_PROGRESS/BLOCKED/REVIEW) stays put — multiple pushes are no-ops.
 *   pr_merged : any non-frozen status completes to DONE. DONE/CANCELED are left alone
 *               (idempotent merge; never un-cancel).
 *
 * Note: a reopened PR does not map to a trigger at all (handled upstream), so it can
 * never call this with an intent to revert.
 */
export function nextStatusForEvent(
  current: string,
  trigger: GithubTransitionTrigger,
): TaskStatus | null {
  if (FROZEN.has(current)) return null;

  if (trigger === "push") {
    return current === TASK_STATUS.TODO ? TASK_STATUS.IN_PROGRESS : null;
  }
  // pr_merged
  return TASK_STATUS.DONE;
}

// Queue names (BullMQ).
export const GITHUB_LINK_QUEUE = "github-link";
export const GITHUB_SYNC_QUEUE = "github-sync";

// Matches `task #<id>` in commit messages (extras: commit ↔ task cross-linking).
// Captures a UUID or a short alphanumeric id.
export const TASK_REF_REGEX = /task\s*#([0-9a-fA-F-]{6,36})/gi;
