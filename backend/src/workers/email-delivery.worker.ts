import { Worker, Job, Queue } from "bullmq";
import nodemailer from "nodemailer";
import { withSuperAdminTransaction } from "../infra/db";
import { mailbox } from "../modules/mailbox/mailbox.schema";
import { eq } from "drizzle-orm";
import { env } from "../infra/env";

export interface EmailDeliveryJobData {
  mailboxId: string;
  to: string;
  subject: string;
  html: string;
  ticketId: string;
  inReplyTo?: string;
  references?: string;
}

const redisConfig = {
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD || undefined,
};

export const emailDeliveryQueue = new Queue<EmailDeliveryJobData>("email-delivery", {
  connection: redisConfig,
});

export class EmailDeliveryWorker {
  private worker: Worker;

  constructor(redisConfig: { host: string; port: number; password?: string }) {
    this.worker = new Worker(
      "email-delivery",
      async (job: Job<EmailDeliveryJobData>) => {
        await this.processJob(job);
      },
      { connection: redisConfig }
    );

    this.worker.on("completed", (job) => {
      console.log(`Email delivery job ${job.id} completed.`);
    });

    this.worker.on("failed", (job, err) => {
      console.error(`Email delivery job ${job?.id} failed:`, err);
    });
  }

  private async processJob(job: Job<EmailDeliveryJobData>) {
    const { mailboxId, to, subject, html, ticketId, inReplyTo, references } = job.data;

    // Fetch mailbox config (background context → bypass RLS)
    const mbxResult = await withSuperAdminTransaction(async (tx) =>
      tx.select().from(mailbox).where(eq(mailbox.id, mailboxId)).limit(1)
    );
    const mbx = mbxResult[0];

    if (!mbx) throw new Error("Mailbox not found");

    if (!mbx.smtpHost) {
      throw new Error("SMTP configuration missing for mailbox");
    }

    const transporter = nodemailer.createTransport({
      host: mbx.smtpHost,
      port: mbx.smtpPort || 587,
      secure: mbx.smtpSecure || false,
      auth: {
        user: mbx.smtpUser || "",
        pass: mbx.smtpPasswordEncrypted || "", // In real scenario, decrypt this
      },
    });

    // Subject Fallback formatting: [TICKET-uuid]
    const formattedSubject = subject.includes(`[TICKET-${ticketId}]`) 
      ? subject 
      : `[TICKET-${ticketId}] ${subject}`;

    const mailOptions = {
      from: `"${mbx.emailAddress}" <${mbx.emailAddress}>`,
      to,
      subject: formattedSubject,
      html: html,
      inReplyTo,
      references,
    };

    await transporter.sendMail(mailOptions);
  }

  public async close() {
    await this.worker.close();
  }
}
