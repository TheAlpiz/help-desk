import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { env } from "../../infra/env";
import { logger } from "../../infra/logger";
import { connectInstallationSchema, linkTaskSchema } from "@help-desk/shared";
import { GithubService } from "./github.service";
import { verifyWebhookSignature, isGithubConfigured } from "./github.client";
import { enqueueGithubSync } from "./github.queue";

// ─── Tiny in-memory per-IP rate limiter for the public webhook ────────────────
// Process-local fixed window. The HMAC signature check is the real gate; this just
// caps abusive volume. Swap for a Redis limiter if running multi-instance.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 120;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || cur.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  cur.count += 1;
  return cur.count > RATE_MAX;
}

function isAdmin(user: JwtPayload | undefined): boolean {
  return user?.globalRole === "ADMIN" || user?.globalRole === "SUPER_ADMIN";
}

export const githubRouter = new Hono<{
  Variables: { tenantId: string; user: JwtPayload };
}>()
  // ─── 1. Public webhook — declared BEFORE authMiddleware so it stays unauthenticated.
  .post("/webhook", async (c) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "unknown";
    if (rateLimited(ip)) {
      return c.json({ success: false, error: { message: "Rate limited" } }, 429);
    }

    if (!env.GITHUB_APP_WEBHOOK_SECRET) {
      logger.warn("[github] webhook received but GITHUB_APP_WEBHOOK_SECRET unset");
      return c.json({ success: false, error: { message: "Not configured" } }, 503);
    }

    // Raw body is required for an exact HMAC over the bytes GitHub signed.
    const raw = await c.req.text();
    const signature = c.req.header("x-hub-signature-256");
    if (!verifyWebhookSignature(raw, signature, env.GITHUB_APP_WEBHOOK_SECRET)) {
      return c.json({ success: false, error: { message: "Bad signature" } }, 401);
    }

    const deliveryId = c.req.header("x-github-delivery");
    const eventType = c.req.header("x-github-event");
    if (!deliveryId || !eventType) {
      return c.json({ success: false, error: { message: "Missing headers" } }, 400);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return c.json({ success: false, error: { message: "Bad JSON" } }, 400);
    }

    // Hand off to the worker and return fast. Idempotency is enforced there + at the DB.
    await enqueueGithubSync({ deliveryId, eventType, payload });
    return c.json({ success: true, data: { accepted: true } }, 202);
  })

  // ─── 2. Everything below requires authentication. ───────────────────────────
  .use("*", authMiddleware())

  // Current org's installation status.
  .get("/installation", async (c) => {
    const tenantId = c.get("tenantId");
    try {
      const install = await GithubService.getInstallation(tenantId);
      return ResponseHandler.ok(c, {
        configured: isGithubConfigured(),
        connected: Boolean(install) && !install?.suspendedAt,
        installation: install
          ? {
              accountLogin: install.accountLogin,
              accountType: install.accountType,
              suspended: Boolean(install.suspendedAt),
            }
          : null,
      });
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  // URL the user clicks to install the GitHub App. `state` round-trips the tenant.
  .get("/install-url", async (c) => {
    const user = c.get("user");
    if (!isAdmin(user)) return ResponseHandler.forbidden(c, "Admins only");
    if (!env.GITHUB_APP_SLUG) {
      return ResponseHandler.badRequest(c, "GitHub App not configured");
    }
    const state = encodeURIComponent(c.get("tenantId"));
    const url = `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new?state=${state}`;
    return ResponseHandler.ok(c, { url });
  })

  // Setup callback target: bind the installation to this org (admin only).
  .post(
    "/installations",
    zValidator("json", connectInstallationSchema),
    async (c) => {
      const user = c.get("user");
      if (!isAdmin(user)) return ResponseHandler.forbidden(c, "Admins only");
      const tenantId = c.get("tenantId");
      const { installationId } = c.req.valid("json");
      try {
        const install = await GithubService.connectInstallation(
          tenantId,
          installationId,
        );
        return ResponseHandler.created(c, {
          accountLogin: install.accountLogin,
          accountType: install.accountType,
        });
      } catch (err: any) {
        return ResponseHandler.badRequest(c, err.message);
      }
    },
  )

  .delete("/installation", async (c) => {
    const user = c.get("user");
    if (!isAdmin(user)) return ResponseHandler.forbidden(c, "Admins only");
    try {
      await GithubService.disconnect(c.get("tenantId"));
      return ResponseHandler.ok(c, { ok: true });
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  // Repos accessible to the org installation (for the task repo picker).
  .get("/repos", async (c) => {
    try {
      const repos = await GithubService.listRepos(c.get("tenantId"));
      return ResponseHandler.ok(c, repos);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  // ─── Task ↔ branch link ─────────────────────────────────────────────────────
  .get("/tasks/:taskId/link", requirePermission("task.read"), async (c) => {
    try {
      const link = await GithubService.getTaskLink(
        c.get("tenantId"),
        c.req.param("taskId") as string,
      );
      return ResponseHandler.ok(c, link);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .post(
    "/tasks/:taskId/link",
    requirePermission("task.create"),
    zValidator("json", linkTaskSchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      const taskId = c.req.param("taskId") as string;
      const { repoFullName } = c.req.valid("json");
      try {
        // Long-running (branch + PR network calls) → enqueue, don't block.
        const { enqueueGithubLink } = await import("./github.queue");
        await enqueueGithubLink({ tenantId, taskId, repoFullName });
        return ResponseHandler.success(
          c,
          { queued: true },
          { status: 202, message: "Branch creation queued" },
        );
      } catch (err: any) {
        return ResponseHandler.badRequest(c, err.message);
      }
    },
  )

  .delete("/tasks/:taskId/link", requirePermission("task.update"), async (c) => {
    try {
      await GithubService.unlinkTask(c.get("tenantId"), c.req.param("taskId") as string);
      return ResponseHandler.ok(c, { ok: true });
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  });
