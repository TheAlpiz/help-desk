import { Worker, Job } from "bullmq";
import { eq } from "drizzle-orm";
import { withSuperAdminTransaction } from "../infra/db";
import { notification } from "../modules/notification/notification.schema";
import { user } from "../modules/user/user.schema";
import { CHANNEL_QUEUE } from "../modules/notification/notification.constants";
import { wsGateway } from "../ws/gateway";
import { sendPlatformEmail } from "../infra/mailer";
import { EmailLang, renderNotificationEmail } from "../lib/email-templates";

interface NotificationJobData {
  userId: string;
  organizationId: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string;
}

export class NotificationWorker {
  private workers: Worker[] = [];

  constructor(redisConfig: { host: string; port: number; password?: string }) {
    // In-app: persist a notification row (read by the bell UI / future WebSocket push).
    this.workers.push(
      new Worker(CHANNEL_QUEUE.IN_APP, (job: Job<NotificationJobData>) => this.processInApp(job), {
        connection: redisConfig,
      }),
    );

    // Email: look up recipient address and hand to transactional mail.
    this.workers.push(
      new Worker(CHANNEL_QUEUE.EMAIL, (job: Job<NotificationJobData>) => this.processEmail(job), {
        connection: redisConfig,
      }),
    );

    // PUSH / SMS: scaffolded so jobs drain instead of piling up. Swap the body for
    // a real provider (FCM/APNs, Twilio) when those channels go live.
    this.workers.push(
      new Worker(CHANNEL_QUEUE.PUSH, (job: Job<NotificationJobData>) => this.processStub("PUSH", job), {
        connection: redisConfig,
      }),
    );
    this.workers.push(
      new Worker(CHANNEL_QUEUE.SMS, (job: Job<NotificationJobData>) => this.processStub("SMS", job), {
        connection: redisConfig,
      }),
    );

    for (const w of this.workers) {
      w.on("failed", (job, err) => console.error(`Notification job ${job?.id} failed:`, err));
    }
  }

  private async processInApp(job: Job<NotificationJobData>) {
    const { userId, type, title, body, actionUrl } = job.data;
    const [row] = await withSuperAdminTransaction(async (tx) =>
      tx
        .insert(notification)
        .values({ userId, type, title, body, actionUrl })
        .returning({ id: notification.id }),
    );
    wsGateway.pushToUser(userId, {
      type: "notification",
      payload: { id: row?.id, title, body, actionUrl },
    });
    console.log(`[IN_APP] -> user ${userId}: ${title}`);
  }

  private async processEmail(job: Job<NotificationJobData>) {
    const { userId, title, body, actionUrl } = job.data;
    const [targetUser] = await withSuperAdminTransaction(async (tx) =>
      tx
        .select({ email: user.email, preferredLanguage: user.preferredLanguage })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1),
    );
    if (!targetUser) return;

    const { subject, html } = renderNotificationEmail({
      title,
      body,
      actionUrl,
      lang: (targetUser.preferredLanguage as EmailLang) ?? "tr",
    });

    await sendPlatformEmail({ to: targetUser.email, subject, html });
  }

  private async processStub(channel: string, job: Job<NotificationJobData>) {
    console.log(`[${channel} stub] -> user ${job.data.userId}: ${job.data.title}`);
  }

  public async close() {
    await Promise.all(this.workers.map((w) => w.close()));
  }
}
