import { cleanEnv, str, port, bool } from "envalid";
import dotenv from "dotenv";

dotenv.config();

export const env = cleanEnv(process.env, {
  DATABASE_URL: str(),
  JWT_SECRET: str({ default: "supersecret" }),
  APP_BASE_URL: str({ default: "http://localhost:5173" }),
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
