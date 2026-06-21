import { cleanEnv, str, port, bool } from "envalid";
import dotenv from "dotenv";

dotenv.config();

export const env = cleanEnv(process.env, {
  DATABASE_URL: str(),
  NODE_ENV: str({ choices: ["development", "test", "production"], default: "development" }),
  // No production default: a missing secret must fail startup, never fall back to a
  // predictable value. devDefault keeps local/test ergonomics.
  JWT_SECRET: str({ devDefault: "dev_only_insecure_secret_change_me" }),
  APP_BASE_URL: str({ default: "http://localhost:5173" }),
  // Comma-separated list of browser origins allowed to send credentialed requests.
  // e.g. "https://app.alpis.app,https://admin.alpis.app". devDefault = Vite dev server.
  CORS_ORIGINS: str({ devDefault: "http://localhost:5173" }),
  // Cookie scope. Leave empty to default to the request host (host-only cookie).
  // Set to a parent domain (e.g. ".alpis.app") to share the refresh cookie across subdomains.
  COOKIE_DOMAIN: str({ default: "" }),
  SENTRY_DSN: str({ default: "" }),
  PORT: port({ default: 3000 }),
  LOG_LEVEL: str({ default: "info" }),
  REDIS_URL: str({ default: "redis://localhost:6379" }),
  REDIS_HOST: str({ default: "localhost" }),
  REDIS_PORT: str({ default: "6379" }),
  REDIS_PASSWORD: str({ default: "" }),
  RABBITMQ_URL: str({ default: "amqp://localhost:5672" }),
  // MinIO Configuration
  MINIO_ENDPOINT: str({ default: 'localhost' }),
  MINIO_PORT: port({ default: 9000 }),
  MINIO_ACCESS_KEY: str({ default: 'minioadmin' }),
  MINIO_SECRET_KEY: str({ default: 'minioadmin' }),
  MINIO_USE_SSL: bool({ default: false }),
});
