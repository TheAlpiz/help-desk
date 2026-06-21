import { Worker, Job } from "bullmq";
import { inArray, lt } from "drizzle-orm";
import * as zlib from "zlib";
import { withSuperAdminTransaction } from "../infra/db";
import { auditLog } from "../modules/audit-log/audit-log.schema";
import { minioClient, AUDIT_ARCHIVE_BUCKET } from "../infra/minio";

export class AuditArchivalWorker {
  private worker: Worker;

  constructor(redisConfig: { host: string; port: number; password?: string }) {
    this.worker = new Worker(
      "audit-archival",
      async (_job: Job) => this.processArchival(),
      { connection: redisConfig },
    );

    this.worker.on("failed", (_job, err) => {
      console.error("AuditArchivalWorker: job failed:", err);
    });
  }

  private async processArchival() {
    console.log("AuditArchivalWorker: starting retention sweep");

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const oldLogs = await withSuperAdminTransaction(async (tx) =>
      tx.select().from(auditLog).where(lt(auditLog.createdAt, cutoff)),
    );

    if (oldLogs.length === 0) {
      console.log("AuditArchivalWorker: nothing to archive");
      return;
    }

    // Partition by org so each archive file stays tenant-scoped.
    const partitions: Record<string, typeof oldLogs> = {};
    for (const log of oldLogs) {
      (partitions[log.organizationId] ??= []).push(log);
    }

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const ts = now.toISOString().replace(/[:.]/g, "-");

    for (const [orgId, logs] of Object.entries(partitions)) {
      try {
        const jsonl = logs.map((l) => JSON.stringify(l)).join("\n");
        const compressed = zlib.gzipSync(Buffer.from(jsonl, "utf8"));

        const objectName = `${orgId}/${year}/${month}/archive-${ts}.jsonl.gz`;
        await minioClient.putObject(
          AUDIT_ARCHIVE_BUCKET,
          objectName,
          compressed,
          compressed.length,
          { "Content-Type": "application/gzip" },
        );

        const ids = logs.map((l) => l.id);
        await withSuperAdminTransaction(async (tx) =>
          tx.delete(auditLog).where(inArray(auditLog.id, ids)),
        );

        console.log(`AuditArchivalWorker: archived ${logs.length} logs for org ${orgId} → ${objectName}`);
      } catch (err) {
        console.error(`AuditArchivalWorker: failed for org ${orgId}`, err);
      }
    }

    console.log("AuditArchivalWorker: sweep complete");
  }

  public async close() {
    await this.worker.close();
  }
}
