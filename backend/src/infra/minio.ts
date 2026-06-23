import * as Minio from "minio";
import { env } from "./env";

export const minioClient = new Minio.Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

// Separate client used only for presigning. Points to the public endpoint so
// the signature is computed against the correct host from the start — rewriting
// the host after signing breaks the signature because `host` is in
// X-Amz-SignedHeaders. Falls back to the internal client when no public URL set.
function makePresignClient(): Minio.Client {
  if (!env.MINIO_PUBLIC_URL) return minioClient;
  const pub = new URL(env.MINIO_PUBLIC_URL);
  const useSSL = pub.protocol === "https:";
  const port = pub.port ? parseInt(pub.port, 10) : useSSL ? 443 : 80;
  return new Minio.Client({
    endPoint: pub.hostname,
    port,
    useSSL,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
  });
}

export const minioPresignClient = makePresignClient();

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
