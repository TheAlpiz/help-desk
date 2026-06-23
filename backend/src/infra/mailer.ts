import nodemailer from "nodemailer";
import { env } from "./env";
import { logger } from "./logger";

// Shared platform SMTP transport for transactional system mail (auth flows,
// notification emails). Reused across calls so we don't open a connection per
// message. When SMTP_HOST is empty (local dev) we log instead of sending, keeping
// flows testable end-to-end without a real mailserver.

let transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter | null {
  if (!env.SMTP_HOST) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transport;
}

/**
 * Send a transactional platform email. Failures are logged but never thrown — a
 * dead mailserver must not break the calling flow (e.g. forgot-password must still
 * return success to avoid leaking which emails exist).
 */
export async function sendPlatformEmail(opts: {
  from?: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const t = getTransport();
  if (!t) {
    logger.info({ to: opts.to, subject: opts.subject }, "[Mailer] SMTP disabled — email logged only");
    return;
  }
  try {
    await t.sendMail({
      from: opts.from || env.SMTP_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      // Loop prevention: these are machine-generated. If the recipient is also a
      // monitored mailbox, the ingestion worker drops mail carrying Auto-Submitted
      // so it is never turned into a ticket (which would notify → loop forever).
      headers: {
        "Auto-Submitted": "auto-generated",
        "X-Auto-Response-Suppress": "All",
      },
    });
  } catch (err) {
    logger.error({ err, to: opts.to, subject: opts.subject }, "[Mailer] Failed to send email");
  }
}
