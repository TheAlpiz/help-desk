import { EmailIngestionWorker } from "./email-ingestion.worker";
import { withSuperAdminTransaction } from "../infra/db";
import { mailbox } from "../modules/mailbox/mailbox.schema";
import { decryptSecret } from "../infra/crypto";
import { eq } from "drizzle-orm";

export class MailboxManager {
  private static instance: MailboxManager;
  private workers: Map<string, EmailIngestionWorker> = new Map();
  private backoffState: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): MailboxManager {
    if (!MailboxManager.instance) {
      MailboxManager.instance = new MailboxManager();
    }
    return MailboxManager.instance;
  }

  /**
   * Initializes all active mailboxes on startup.
   */
  public async initAll() {
    console.log("MailboxManager: Initializing all active mailboxes...");
    try {
      const mailboxes = await withSuperAdminTransaction(async (tx) =>
        tx.select().from(mailbox)
      );
      for (const mbx of mailboxes) {
        await this.startListener(mbx.id);
      }
    } catch (err) {
      console.error("MailboxManager: Error initializing mailboxes", err);
    }
  }

  public async startListener(mailboxId: string) {
    if (this.workers.has(mailboxId)) {
      console.log(`MailboxManager: Listener for ${mailboxId} already running.`);
      return;
    }

    try {
      const mbxResult = await withSuperAdminTransaction(async (tx) =>
        tx.select().from(mailbox).where(eq(mailbox.id, mailboxId)).limit(1)
      );
      const mbx = mbxResult[0];

      if (!mbx) {
        throw new Error(`Mailbox ${mailboxId} not found.`);
      }

      if (!mbx.imapHost || !mbx.imapUser || !mbx.imapPasswordEncrypted) {
        console.warn(
          `MailboxManager: Mailbox ${mailboxId} missing IMAP credentials. Skipping.`,
        );
        return;
      }

      const worker = new EmailIngestionWorker(
        {
          host: mbx.imapHost,
          port: mbx.imapPort || 993,
          secure: mbx.imapSecure !== false,
          auth: {
            user: mbx.imapUser,
            pass: decryptSecret(mbx.imapPasswordEncrypted) ?? "",
          },
        },
        mbx.organizationId,
        mbx.id,
      );

      // Listen for unexpected disconnects from ImapFlow
      worker.onDisconnect(async () => {
        console.error(`MailboxManager: Disconnect detected for ${mailboxId}`);
        await this.handleDisconnect(mailboxId);
      });

      console.log(`MailboxManager: Starting listener for ${mailboxId}`);
      await worker.start();

      this.workers.set(mailboxId, worker);
      this.backoffState.delete(mailboxId); // Reset backoff on success
    } catch (error) {
      console.error(
        `MailboxManager: Failed to start listener for ${mailboxId}:`,
        error,
      );
      await this.handleDisconnect(mailboxId);
    }
  }

  public async stopListener(mailboxId: string) {
    const worker = this.workers.get(mailboxId);
    if (worker) {
      console.log(`MailboxManager: Stopping listener for ${mailboxId}`);
      try {
        await worker.stop();
      } catch (err) {
        console.error(
          `MailboxManager: Error stopping listener for ${mailboxId}`,
          err,
        );
      }
      this.workers.delete(mailboxId);
    }
    this.backoffState.delete(mailboxId);
  }

  public async restartListener(mailboxId: string) {
    console.log(`MailboxManager: Restarting listener for ${mailboxId}`);
    await this.stopListener(mailboxId);
    await this.startListener(mailboxId);
  }

  public async updateCredentials(mailboxId: string) {
    console.log(`MailboxManager: Updating credentials for ${mailboxId}`);
    // Restarting will naturally fetch the fresh credentials from the DB
    await this.restartListener(mailboxId);
  }

  /**
   * Exponential backoff logic for handling IMAP disconnects
   */
  private async handleDisconnect(mailboxId: string) {
    this.workers.delete(mailboxId);

    let attempt = this.backoffState.get(mailboxId) || 1;
    const maxBackoff = 15 * 60 * 1000; // 15 minutes

    // Calculate delay: 5s, 10s, 30s, 60s...
    let delay = Math.min(attempt * attempt * 5000, maxBackoff);

    console.log(
      `MailboxManager: Scheduling reconnect for ${mailboxId} in ${delay}ms (Attempt ${attempt})`,
    );

    this.backoffState.set(mailboxId, attempt + 1);

    setTimeout(async () => {
      console.log(
        `MailboxManager: Executing reconnect attempt ${attempt} for ${mailboxId}`,
      );
      await this.startListener(mailboxId);
    }, delay);
  }
}
