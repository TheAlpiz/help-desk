import { serve } from "@hono/node-server";
import { Hono } from "hono";
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
import { NotificationService } from "./modules/notification/notification.service";
import { initAutomationListeners } from "./workers/automation.listener";
import { Queue } from "bullmq";
import { setupDatabaseTriggers } from "./infra/db/setup-triggers";
import { setupRowLevelSecurity } from "./infra/db/rls";
import { runSeed } from "./infra/db/seed";
import { initMinio } from "./infra/minio";
import { wsGateway } from "./ws/gateway";
import { initRealtimeBridge } from "./ws/events";

const app = new Hono<{ Variables: { tenantId: string } }>();

app.use(
  sentry(app, {
    dsn: env.SENTRY_DSN,
    dataCollection: { userInfo: false },
  }),
);

app.use("*", tenantMiddleware());

// Initialize Redis
connectRedis().catch(logger.error);

// Initialize Mailbox Listeners
MailboxManager.getInstance().initAll().catch(logger.error);

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

// Initialize Notification Event Bus Listeners
NotificationService.initListeners();

// Initialize Automation Event Listeners
initAutomationListeners();

// Initialize Audit Archival Worker (Cron)
new AuditArchivalWorker({
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD || undefined,
});

// Schedule the nightly retention sweep
const auditQueue = new Queue("audit-archival", {
  connection: {
    host: env.REDIS_HOST,
    port: parseInt(env.REDIS_PORT),
    password: env.REDIS_PASSWORD || undefined,
  },
});

auditQueue
  .add("nightly-sweep", {}, { repeat: { pattern: "0 2 * * *" } })
  .catch(logger.error);

// Initialize DB Triggers, enforce Row Level Security, then seed.
// Ordered so RLS policies exist before any tenant traffic is served.
(async () => {
  await setupDatabaseTriggers();
  await setupRowLevelSecurity();
  await runSeed();
})().catch(logger.error);

// Initialize MinIO
initMinio().catch(logger.error);

app.notFound((c) => {
  return ResponseHandler.notFound(c);
});

app.onError((err, c) => {
  logger.error(err, "Global error handler caught an error");
  return ResponseHandler.internalServerError(c);
});

const routes = new Hono()
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
