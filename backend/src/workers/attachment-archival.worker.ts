import { Worker, Job } from "bullmq";
import { inArray, lt, and, eq } from "drizzle-orm";
import { withSuperAdminTransaction } from "../infra/db";
import { attachment } from "../modules/attachment/attachment.schema";
import { minioClient, BUCKET_NAME } from "../infra/minio";
import { OrganizationService } from "../modules/organization/organization.service";

export class AttachmentArchivalWorker {
  private worker: Worker;

  constructor(redisConfig: { host: string; port: number; password?: string }) {
    this.worker = new Worker(
      "attachment-archival",
      async (_job: Job) => this.processArchival(),
      { connection: redisConfig },
    );

    this.worker.on("failed", (_job, err) => {
      console.error("AttachmentArchivalWorker: job failed:", err);
    });
  }

  private async processArchival() {
    console.log("AttachmentArchivalWorker: starting retention sweep");

    const orgs = await OrganizationService.findAllWithRetentionConfigs();

    for (const org of orgs) {
      const config = (org.dataRetentionConfig as any) || {};
      
      // Respect auto-delete toggle
      if (config.isAutoArchivalEnabled === false) {
        continue;
      }

      const isEnabled = config.isAutoArchivalEnabled === true || !org.dataRetentionConfig;
      if (!isEnabled) continue;

      const retentionDays = config.attachmentRetentionDays ?? 365;

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);

      try {
        const oldAttachments = await withSuperAdminTransaction(async (tx) =>
          tx.select().from(attachment).where(
            and(
              eq(attachment.organizationId, org.id),
              lt(attachment.createdAt, cutoff)
            )
          ),
        );

        if (oldAttachments.length === 0) continue;

        let deletedCount = 0;

        for (const att of oldAttachments) {
          try {
            // Remove from MinIO
            await minioClient.removeObject(BUCKET_NAME, att.storageKey);

            // Remove from DB
            await withSuperAdminTransaction(async (tx) =>
              tx.delete(attachment).where(eq(attachment.id, att.id)),
            );
            deletedCount++;
          } catch (err) {
            console.error(`AttachmentArchivalWorker: failed to delete attachment ${att.id}`, err);
          }
        }

        console.log(`AttachmentArchivalWorker: permanently deleted ${deletedCount}/${oldAttachments.length} attachments for org ${org.id}`);
      } catch (err) {
        console.error(`AttachmentArchivalWorker: failed for org ${org.id}`, err);
      }
    }

    console.log("AttachmentArchivalWorker: sweep complete");
  }

  public async close() {
    await this.worker.close();
  }
}
