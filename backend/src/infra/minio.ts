import * as Minio from "minio";
import { env } from "./env";

export const minioClient = new Minio.Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export const BUCKET_NAME = "helpdesk-attachments";
export const AUDIT_ARCHIVE_BUCKET = "helpdesk-audit-archives";

export const initMinio = async () => {
  try {
    for (const bucket of [BUCKET_NAME, AUDIT_ARCHIVE_BUCKET]) {
      const exists = await minioClient.bucketExists(bucket);
      if (!exists) {
        await minioClient.makeBucket(bucket, "us-east-1");
        console.log(`MinIO: Bucket '${bucket}' created.`);
      }
    }
  } catch (err) {
    console.error("MinIO Initialization Error:", err);
  }
};
