import * as Minio from "minio";
import { env } from "./env";

export const minioClient = new Minio.Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

// Rewrites the internal MinIO host in a presigned URL to the public URL so
// browsers served over HTTPS don't get mixed-content errors.
export function toPublicUrl(presignedUrl: string): string {
  if (!env.MINIO_PUBLIC_URL) return presignedUrl;
  const internal = new URL(presignedUrl);
  const pub = new URL(env.MINIO_PUBLIC_URL);
  internal.protocol = pub.protocol;
  internal.hostname = pub.hostname;
  internal.port = pub.port;
  return internal.toString();
}

export const BUCKET_NAME = "helpdesk-attachments";
export const AUDIT_ARCHIVE_BUCKET = "helpdesk-audit-archives";
export const TICKET_ARCHIVE_BUCKET = "helpdesk-ticket-archives";

export const initMinio = async () => {
  try {
    for (const bucket of [BUCKET_NAME, AUDIT_ARCHIVE_BUCKET, TICKET_ARCHIVE_BUCKET]) {
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
