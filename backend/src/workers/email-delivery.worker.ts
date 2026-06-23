import { Worker, Job, Queue } from "bullmq";
import nodemailer from "nodemailer";
import { withSuperAdminTransaction } from "../infra/db";
import { mailbox } from "../modules/mailbox/mailbox.schema";
import { emailSend } from "../modules/email/email.schema";
import { eq } from "drizzle-orm";
import { env } from "../infra/env";
import { decryptSecret } from "../infra/crypto";
import { buildVariableMap, interpolate } from "../modules/email/variable-renderer";
import { resolveSignature, wrapSignature } from "../modules/email/signature-resolver";
import { injectTracking } from "../modules/email/email-tracking";

export interface EmailDeliveryJobData {
  mailboxId: string;
  to: string;
  subject: string;
  html: string;
  ticketId: string;
  templateType?: string;
  /** ID of the agent who triggered this send — used to resolve {{agent_*}} variables. */
  senderId?: string | null;
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
      { connection: redisConfig },
    );

    this.worker.on("completed", (job) => {
      console.log(`Email delivery job ${job.id} completed.`);
    });

    this.worker.on("failed", (job, err) => {
      console.error(`Email delivery job ${job?.id} failed:`, err);
    });
  }

  private async processJob(job: Job<EmailDeliveryJobData>) {
    const { mailboxId, to, subject, html, ticketId, senderId, templateType, inReplyTo, references } = job.data;

    const { mbx, vars, signatureHtml, organizationId } = await withSuperAdminTransaction(async (tx) => {
      const [mbx] = await tx.select().from(mailbox).where(eq(mailbox.id, mailboxId)).limit(1);
      if (!mbx) return { mbx: null, vars: {}, signatureHtml: null, organizationId: "" };

      const [vars, signatureHtml] = await Promise.all([
        buildVariableMap(tx, ticketId, mailboxId, senderId),
        resolveSignature(tx, mbx.organizationId, senderId, { ticketId, mailboxId }),
      ]);
      return { mbx, vars, signatureHtml, organizationId: mbx.organizationId };
    });

    if (!mbx) throw new Error("Mailbox not found");
    if (!mbx.smtpHost) throw new Error("SMTP configuration missing for mailbox");

    const transporter = nodemailer.createTransport({
      host: mbx.smtpHost,
      port: mbx.smtpPort || 587,
      secure: mbx.smtpSecure || false,
      auth: {
        user: mbx.smtpUser || "",
        pass: decryptSecret(mbx.smtpPasswordEncrypted) || "",
      },
      tls: { rejectUnauthorized: false },
    });

    const baseSubject = subject.includes(`[TICKET-${ticketId}]`)
      ? subject
      : `[TICKET-${ticketId}] ${subject}`;

    const renderedSubject = interpolate(baseSubject, vars);

    let renderedHtml = interpolate(html, vars);
    if (signatureHtml) {
      renderedHtml += wrapSignature(interpolate(signatureHtml, vars));
    }

    // Insert send record and get trackingId, then inject tracking beacons
    const [sendRecord] = await withSuperAdminTransaction(async (tx) =>
      tx
        .insert(emailSend)
        .values({
          organizationId,
          ticketId,
          mailboxId,
          recipientEmail: to,
          templateType: templateType ?? null,
          subject: renderedSubject,
        })
        .returning({ id: emailSend.id, trackingId: emailSend.trackingId }),
    );

    const trackedHtml = injectTracking(renderedHtml, sendRecord.trackingId, env.APP_BASE_URL);

    await transporter.sendMail({
      from: `"${mbx.emailAddress}" <${mbx.emailAddress}>`,
      to,
      subject: renderedSubject,
      html: trackedHtml,
      inReplyTo,
      references,
    });
  }

  public async close() {
    await this.worker.close();
  }
}
