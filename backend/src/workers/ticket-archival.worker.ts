import { Worker, Job } from "bullmq";
import { inArray, lt, and, eq } from "drizzle-orm";
import * as zlib from "zlib";
import { withSuperAdminTransaction } from "../infra/db";
import { ticket } from "../modules/ticket/ticket.schema";
import { minioClient, TICKET_ARCHIVE_BUCKET } from "../infra/minio";
import { OrganizationService } from "../modules/organization/organization.service";

export class TicketArchivalWorker {
  private worker: Worker;

  constructor(redisConfig: { host: string; port: number; password?: string }) {
    this.worker = new Worker(
      "ticket-archival",
      async (_job: Job) => this.processArchival(),
      { connection: redisConfig },
    );

    this.worker.on("failed", (_job, err) => {
      console.error("TicketArchivalWorker: job failed:", err);
    });
  }

  private async processArchival() {
    console.log("TicketArchivalWorker: starting retention sweep");

    const orgs = await OrganizationService.findAllWithRetentionConfigs();

    for (const org of orgs) {
      const config = (org.dataRetentionConfig as any) || {};
      
      // Respect auto-delete toggle
      if (config.isAutoArchivalEnabled === false) {
        continue;
      }

      const isEnabled = config.isAutoArchivalEnabled === true || !org.dataRetentionConfig;
      if (!isEnabled) continue;

      const retentionDays = config.ticketRetentionDays ?? 730; // default 2 years

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);

      try {
        const oldTickets = await withSuperAdminTransaction(async (tx) =>
          tx.select().from(ticket).where(
            and(
              eq(ticket.organizationId, org.id),
              lt(ticket.createdAt, cutoff)
            )
          ),
        );

        if (oldTickets.length === 0) continue;

        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, "0");
        const ts = now.toISOString().replace(/[:.]/g, "-");

        const jsonl = oldTickets.map((t) => JSON.stringify(t)).join("\n");
        const compressed = zlib.gzipSync(Buffer.from(jsonl, "utf8"));

        const objectName = `${org.id}/${year}/${month}/tickets-${ts}.jsonl.gz`;
        await minioClient.putObject(
          TICKET_ARCHIVE_BUCKET,
          objectName,
          compressed,
          compressed.length,
          { "Content-Type": "application/gzip" },
        );

        const ids = oldTickets.map((t) => t.id);
        
        // Delete in batches if there are many tickets, though Postgres can handle quite a bit
        await withSuperAdminTransaction(async (tx) =>
          tx.delete(ticket).where(inArray(ticket.id, ids)),
        );

        console.log(`TicketArchivalWorker: archived ${oldTickets.length} tickets for org ${org.id} → ${objectName}`);
      } catch (err) {
        console.error(`TicketArchivalWorker: failed for org ${org.id}`, err);
      }
    }

    console.log("TicketArchivalWorker: sweep complete");
  }

  public async close() {
    await this.worker.close();
  }
}
