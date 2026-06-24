import { Worker, Queue, Job } from "bullmq";
import { eq } from "drizzle-orm";
import { env } from "../infra/env";
import { withSuperAdminTransaction } from "../infra/db";
import { userNote } from "../modules/note/note.schema";
import { notification } from "../modules/notification/notification.schema";
import { wsGateway } from "../ws/gateway";

const redisConfig = {
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD || undefined,
};

export const REMINDER_QUEUE = "note-reminder";

// Delayed jobs live here; one per note (jobId derived from the note id so a
// reschedule simply replaces it).
export const reminderQueue = new Queue(REMINDER_QUEUE, { connection: redisConfig });

export const reminderJobId = (noteId: string) => `note-reminder:${noteId}`;

/**
 * Fires personal-note reminders. On due, it persists an in-app notification and
 * pushes the realtime `notification` event — the same path a new ticket takes,
 * so the frontend plays the identical arrival sound.
 */
export class ReminderWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(REMINDER_QUEUE, (job: Job<{ noteId: string }>) => this.process(job), {
      connection: redisConfig,
    });
    this.worker.on("failed", (job, err) => console.error(`Reminder job ${job?.id} failed:`, err));
  }

  private async process(job: Job<{ noteId: string }>) {
    const { noteId } = job.data;

    // Load + claim the reminder in one trusted transaction (RLS bypassed).
    const note = await withSuperAdminTransaction(async (tx) => {
      const [n] = await tx.select().from(userNote).where(eq(userNote.id, noteId)).limit(1);
      if (!n || !n.reminderAt || n.reminderFired) return null;
      await tx.update(userNote).set({ reminderFired: true }).where(eq(userNote.id, noteId));
      return n;
    });
    if (!note) return;

    const title = note.title ? `Reminder: ${note.title}` : "Note reminder";
    const body = (note.content ?? "").slice(0, 140);

    const [row] = await withSuperAdminTransaction(async (tx) =>
      tx
        .insert(notification)
        .values({ userId: note.userId, type: "note.reminder", title, body, actionUrl: "/notes" })
        .returning({ id: notification.id }),
    );

    wsGateway.pushToUser(note.userId, {
      type: "notification",
      payload: { id: row?.id, title, body, actionUrl: "/notes" },
    });
  }

  async close() {
    await this.worker.close();
  }
}
