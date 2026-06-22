import { Worker, Job } from "bullmq";
import { inArray, lt, and, eq } from "drizzle-orm";
import * as zlib from "zlib";
import { withSuperAdminTransaction } from "../infra/db";
import { auditLog } from "../modules/audit-log/audit-log.schema";
import { minioClient, AUDIT_ARCHIVE_BUCKET } from "../infra/minio";
import { OrganizationService } from "../modules/organization/organization.service";

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

    const orgs = await OrganizationService.findAllWithRetentionConfigs();

    for (const org of orgs) {
      const config = (org.dataRetentionConfig as any) || {};
      
      // Default fallback if not set, but only if they explicitly enabled it or if we enforce it globally.
      // Wait, the UI has a toggle `isAutoArchivalEnabled`. Let's respect it.
      // If it's undefined, we fallback to a safe default. Let's assume it's disabled by default.
      if (config.isAutoArchivalEnabled === false) {
        continue;
      }

      // If it's true OR if it's completely empty (backwards compatibility), we can apply a default.
      // Let's only archive if explicitly enabled to be safe with data, or if there's no config at all we apply a global 365 days.
      const isEnabled = config.isAutoArchivalEnabled === true || !org.dataRetentionConfig;
      if (!isEnabled) continue;

      const retentionDays = config.auditLogRetentionDays ?? 365;

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);

      try {
        const oldLogs = await withSuperAdminTransaction(async (tx) =>
          tx.select().from(auditLog).where(
            and(
              eq(auditLog.organizationId, org.id),
              lt(auditLog.createdAt, cutoff)
            )
          ),
        );

        if (oldLogs.length === 0) continue;

        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, "0");
        const ts = now.toISOString().replace(/[:.]/g, "-");

        const jsonl = oldLogs.map((l) => JSON.stringify(l)).join("\n");
        const compressed = zlib.gzipSync(Buffer.from(jsonl, "utf8"));

        const objectName = `${org.id}/${year}/${month}/archive-${ts}.jsonl.gz`;
        await minioClient.putObject(
          AUDIT_ARCHIVE_BUCKET,
          objectName,
          compressed,
          compressed.length,
          { "Content-Type": "application/gzip" },
        );

        const ids = oldLogs.map((l) => l.id);
        await withSuperAdminTransaction(async (tx) =>
          tx.delete(auditLog).where(inArray(auditLog.id, ids)),
        );

        console.log(`AuditArchivalWorker: archived ${oldLogs.length} logs for org ${org.id} → ${objectName}`);
      } catch (err) {
        console.error(`AuditArchivalWorker: failed for org ${org.id}`, err);
      }
    }

    console.log("AuditArchivalWorker: sweep complete");
  }

  public async close() {
    await this.worker.close();
  }
}
