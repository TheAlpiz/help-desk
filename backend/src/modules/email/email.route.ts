import { Hono } from "hono";
import { emailController } from "./email.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { zValidator } from "@hono/zod-validator";
import {
  emailBrandingSchema,
  saveTemplateVersionSchema,
  createEmailSignatureSchema,
  saveSignatureVersionSchema,
} from "@help-desk/shared";
import { recordOpen, recordClick } from "./email-tracking";
import { env } from "../../infra/env";
import { createHash } from "crypto";

const app = new Hono();

// ── Tracking (no auth — public pixel/redirect endpoints) ─────────────────────

// 1×1 transparent PNG bytes
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

app.get("/track/open/:trackingId", async (c) => {
  const { trackingId } = c.req.param();
  await recordOpen(trackingId).catch(() => {});
  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
});

app.get("/track/click/:trackingId", async (c) => {
  const { trackingId } = c.req.param();
  const originalUrl = c.req.query("url") ?? "/";
  const userAgent = c.req.header("user-agent");
  const ip = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "";
  const ipHash = ip ? createHash("sha256").update(ip + env.JWT_SECRET).digest("hex") : undefined;

  await recordClick(trackingId, originalUrl, userAgent, ipHash).catch(() => {});
  return c.redirect(originalUrl, 302);
});

// ── Branding ──────────────────────────────────────────────────────────────────

app.get("/branding", authMiddleware(), (c) => emailController.getBranding(c));
app.put("/branding", authMiddleware(), requirePermission("branding.manage"), zValidator("json", emailBrandingSchema), (c) => emailController.updateBranding(c));

// ── Render (block JSON → email HTML via react-email) ──────────────────────────

app.post("/render", authMiddleware(), (c) => emailController.renderBlocks(c));

// ── Templates ─────────────────────────────────────────────────────────────────

app.get("/templates", authMiddleware(), (c) => emailController.listTemplates(c));
app.post("/templates", authMiddleware(), requirePermission("template.manage"), (c) => emailController.createTemplate(c));
app.get("/templates/:type/active", authMiddleware(), (c) => emailController.getActiveTemplate(c));
app.post("/templates/:id/versions", authMiddleware(), requirePermission("template.manage"), zValidator("json", saveTemplateVersionSchema), (c) => emailController.saveTemplateVersion(c));

// ── Approval workflow ─────────────────────────────────────────────────────────

app.get("/approvals/pending", authMiddleware(), requirePermission("template.manage"), (c) => emailController.listPendingApprovals(c));
app.post("/versions/:versionId/request-approval", authMiddleware(), requirePermission("template.manage"), (c) => emailController.requestApproval(c));
app.post("/approvals/:approvalId/review", authMiddleware(), requirePermission("template.approve"), (c) => emailController.reviewApproval(c));

// ── Signatures ────────────────────────────────────────────────────────────────
// Ownership is enforced in the controller, not at the route level, so any
// authenticated user can manage their own personal (AGENT) signature.

app.get("/signatures", authMiddleware(), (c) => emailController.listSignatures(c));
app.get("/signatures/search", authMiddleware(), (c) => emailController.getSignature(c));
app.post("/signatures", authMiddleware(), requirePermission("signature.manage_own"), zValidator("json", createEmailSignatureSchema), (c) => emailController.createSignature(c));
app.get("/signatures/:id", authMiddleware(), (c) => emailController.getSignatureById(c));
app.put("/signatures/:id", authMiddleware(), requirePermission("signature.manage_own"), (c) => emailController.updateSignature(c));
app.post("/signatures/:id/versions", authMiddleware(), requirePermission("signature.manage_own"), zValidator("json", saveSignatureVersionSchema), (c) => emailController.saveSignatureVersion(c));

// ── Signature rules ─────────────────────────────────────────────────── admin ─

app.get("/signature-rules", authMiddleware(), (c) => emailController.listSignatureRules(c));
app.post("/signature-rules", authMiddleware(), requirePermission("signature.manage"), (c) => emailController.createSignatureRule(c));
app.put("/signature-rules/:ruleId", authMiddleware(), requirePermission("signature.manage"), (c) => emailController.updateSignatureRule(c));
app.delete("/signature-rules/:ruleId", authMiddleware(), requirePermission("signature.manage"), (c) => emailController.deleteSignatureRule(c));

// ── Analytics ─────────────────────────────────────────────────────────────────

app.get("/analytics", authMiddleware(), (c) => emailController.getAnalytics(c));
app.get("/analytics/sends", authMiddleware(), (c) => emailController.listRecentSends(c));

export default app;
