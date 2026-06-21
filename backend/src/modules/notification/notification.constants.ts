/**
 * Notification channel catalog. Adding a future channel (PUSH/SMS) is a matter of:
 *   1. listing it here,
 *   2. creating its queue (NotificationService.channelQueues),
 *   3. adding a worker that drains that queue (NotificationWorker).
 * The dispatch fan-out is fully data-driven off this list — no branching to edit.
 */
export const NOTIFICATION_CHANNELS = ["IN_APP", "EMAIL", "PUSH", "SMS"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/** BullMQ queue name per channel. */
export const CHANNEL_QUEUE: Record<NotificationChannel, string> = {
  IN_APP: "notification-inapp",
  EMAIL: "notification-email",
  PUSH: "notification-push",
  SMS: "notification-sms",
};

/** Channels currently wired to a real delivery worker. PUSH/SMS are scaffolded (stubs). */
export const LIVE_CHANNELS: NotificationChannel[] = ["IN_APP", "EMAIL"];

/**
 * Default channels when a user has set no preference for an event.
 * In-app is always on; email for everything by default.
 */
export const DEFAULT_CHANNELS: NotificationChannel[] = ["IN_APP", "EMAIL"];

/**
 * Mention syntax stored in message/comment bodies: `@[<userId>]`.
 * Frontend renders these as chips; backend extracts the referenced user IDs.
 */
const MENTION_REGEX = /@\[([0-9a-fA-F-]{36})\]/g;

export function parseMentions(content: string): string[] {
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = MENTION_REGEX.exec(content)) !== null) {
    ids.add(m[1]);
  }
  return Array.from(ids);
}
