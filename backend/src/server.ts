import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "./infra/logger";
import { env } from "./infra/env";
import { ResponseHandler } from "./lib/response";
import { connectRedis } from "./infra/redis";
import { sentry } from "@sentry/hono/cloudflare";
import { NotificationRouter } from "./modules/notification";
import { AttachmentRouter } from "./modules/attachment";
import { AnalyticsRouter } from "./modules/analytics";
import appRouter from "./routes/index";
import { tenantMiddleware } from "./middleware/tenant.middleware";
import { MailboxManager } from "./workers/mailbox.manager";
import { SlaWorker } from "./workers/sla.worker";
import { NotificationWorker } from "./workers/notification.worker";
import { EmailDeliveryWorker } from "./workers/email-delivery.worker";
import { AuditArchivalWorker } from "./workers/audit-archival.worker";
import { TicketArchivalWorker } from "./workers/ticket-archival.worker";
import { AttachmentArchivalWorker } from "./workers/attachment-archival.worker";
import { ReminderWorker } from "./workers/reminder.worker";
import { NotificationService } from "./modules/notification/notification.service";
import { initAutomationListeners } from "./workers/automation.listener";
import { initEmailTemplateListeners } from "./workers/email-template.listener";
import { Queue } from "bullmq";
import { setupDatabaseTriggers } from "./infra/db/setup-triggers";
import { setupRowLevelSecurity } from "./infra/db/rls";
import { runSeed } from "./infra/db/seed";
import { initMinio } from "./infra/minio";
import { wsGateway } from "./ws/gateway";
import { initRealtimeBridge } from "./ws/events";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./infra/db";
import path from "path";

const app = new Hono<{ Variables: { tenantId: string } }>({ strict: false });

app.use(
  sentry(app, {
    dsn: env.SENTRY_DSN,
    dataCollection: { userInfo: false },
  }),
);

// Credentialed CORS: only allow-listed origins may send the refresh/CSRF cookies.
// `credentials: true` requires an explicit origin echo (never "*").
const allowedOrigins = env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
app.use(
  "*",
  cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "X-Tenant-ID", "X-CSRF-Token"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.use("*", tenantMiddleware());

// Initialize Redis
connectRedis().catch((err) => logger.error(err));

// Initialize Mailbox Listeners
MailboxManager.getInstance().initAll().catch((err) => logger.error(err));

// Initialize SLA Worker
new SlaWorker({
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD || undefined,
});

// Initialize Notification Worker
new NotificationWorker({
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD || undefined,
});

// Initialize Email Delivery Worker (SMTP outbound)
new EmailDeliveryWorker({
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD || undefined,
});

// Initialize Personal-Note Reminder Worker (delayed jobs → in-app notification + sound)
new ReminderWorker();

// Initialize Notification Event Bus Listeners
NotificationService.initListeners();

// Initialize Automation Event Listeners
initAutomationListeners();

// Initialize event-driven email template dispatch (ticket_created, ticket_closed)
initEmailTemplateListeners();

// Initialize Archival Workers (Cron)
new AuditArchivalWorker({
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD || undefined,
});

new TicketArchivalWorker({
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD || undefined,
});

new AttachmentArchivalWorker({
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD || undefined,
});

// Schedule the nightly retention sweeps
const redisConnection = {
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD || undefined,
};

const auditQueue = new Queue("audit-archival", { connection: redisConnection });
const ticketQueue = new Queue("ticket-archival", { connection: redisConnection });
const attachmentQueue = new Queue("attachment-archival", { connection: redisConnection });

auditQueue.add("nightly-sweep", {}, { repeat: { pattern: "0 2 * * *" } }).catch((err) => logger.error(err));
ticketQueue.add("nightly-sweep", {}, { repeat: { pattern: "0 2 * * *" } }).catch((err) => logger.error(err));
attachmentQueue.add("nightly-sweep", {}, { repeat: { pattern: "0 2 * * *" } }).catch((err) => logger.error(err));

// Initialize DB Triggers, enforce Row Level Security, then seed.
// Ordered so RLS policies exist before any tenant traffic is served.
(async () => {
  logger.info("Running database migrations...");
  await migrate(db, { migrationsFolder: path.join(__dirname, "infra/db/migrations") });
  logger.info("Database migrations completed.");

  await setupDatabaseTriggers();
  await setupRowLevelSecurity();
  await runSeed();
})().catch((err) => logger.error(err));

// Initialize MinIO
initMinio().catch((err) => logger.error(err));

app.notFound((c) => {
  return ResponseHandler.notFound(c);
});

app.onError((err, c) => {
  logger.error(err, "Global error handler caught an error");
  return ResponseHandler.internalServerError(c);
});

const routes = new Hono({ strict: false })
  .basePath("/api")
  .route("/", appRouter)
  .route("/notifications", NotificationRouter)
  .route("/attachments", AttachmentRouter)
  .route("/analytics", AnalyticsRouter);

app.route("/", routes); // mount it on the runtime app

const httpServer = serve({ fetch: app.fetch, port: env.PORT }, () => {
  logger.info(`Server running on port ${env.PORT}`);
});

wsGateway.attach(httpServer as unknown as import("http").Server);
initRealtimeBridge();

export default app;
export type AppType = typeof routes; // now resolves to a concrete Hono type
