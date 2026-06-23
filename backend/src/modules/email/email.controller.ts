import { Context } from "hono";
import { emailService } from "./email.service";
import { renderFullEmail, renderSignatureFragment } from "./email-renderer";

export class EmailController {
  async renderBlocks(c: Context) {
    const body = await c.req.json<{
      blocks: any[];
      globalStyles: any;
      branding?: any;
      mode?: "full" | "signature";
      previewText?: string;
    }>();

    const { blocks, globalStyles, branding = {}, mode = "signature", previewText } = body;

    const html =
      mode === "full"
        ? await renderFullEmail(blocks, globalStyles, branding, previewText)
        : await renderSignatureFragment(blocks, globalStyles);

    return c.json({ data: { html } });
  }

  async createTemplate(c: Context) {
    const orgId = c.get("tenantId");
    if (!orgId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json<{ type: string; name: string }>();
    const template = await emailService.createTemplate(orgId, body.type, body.name);
    return c.json({ data: template }, 201);
  }


  async getBranding(c: Context) {
    const orgId = c.get("tenantId");
    if (!orgId) return c.json({ error: "Unauthorized" }, 401);

    const branding = await emailService.getBranding(orgId);
    return c.json({ data: branding || {} });
  }

  async updateBranding(c: Context) {
    const orgId = c.get("tenantId");
    if (!orgId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const updated = await emailService.updateBranding(orgId, body);
    return c.json({ data: updated });
  }

  async listTemplates(c: Context) {
    const orgId = c.get("tenantId");
    if (!orgId) return c.json({ error: "Unauthorized" }, 401);

    const templates = await emailService.listTemplates(orgId);
    return c.json({ data: templates });
  }

  async getActiveTemplate(c: Context) {
    const orgId = c.get("tenantId");
    const { type } = c.req.param();
    if (!orgId) return c.json({ error: "Unauthorized" }, 401);

    const template = await emailService.getActiveTemplateVersion(orgId, type);
    return c.json({ data: template });
  }

  async saveTemplateVersion(c: Context) {
    const userId = c.get("user")?.userId;
    const { id } = c.req.param();
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const version = await emailService.saveTemplateVersion(id, body, userId);
    return c.json({ data: version });
  }

  async listSignatures(c: Context) {
    const orgId = c.get("tenantId");
    const user = c.get("user");
    if (!orgId || !user) return c.json({ error: "Unauthorized" }, 401);

    const isAdmin = ["ADMIN", "SUPER_ADMIN", "SUPERVISOR"].includes(user.globalRole);
    const signatures = await emailService.listSignatures(orgId, user.userId, isAdmin);
    return c.json({ data: signatures });
  }

  async getSignature(c: Context) {
    const orgId = c.get("tenantId");
    const ownerType = c.req.query("ownerType");
    const ownerId = c.req.query("ownerId");
    if (!orgId || !ownerType || !ownerId) return c.json({ error: "Missing required query params" }, 400);

    const signature = await emailService.getSignature(orgId, ownerType, ownerId);
    return c.json({ data: signature });
  }

  async getSignatureById(c: Context) {
    const { id } = c.req.param();
    const user = c.get("user");
    const signature = await emailService.getSignatureById(id);
    if (!signature) return c.json({ error: "Not found" }, 404);

    // Non-admin agents can only read their own personal signature
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "SUPERVISOR"].includes(user?.globalRole ?? "");
    if (!isAdmin && signature.signature.ownerType === "AGENT" && signature.signature.ownerId !== user?.userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    return c.json({ data: signature });
  }

  async createSignature(c: Context) {
    const orgId = c.get("tenantId");
    const user = c.get("user");
    if (!orgId || !user) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.globalRole);

    if (body.ownerType === "AGENT") {
      // Agents can only create their own signature
      if (!isAdmin && body.ownerId !== user.userId) {
        return c.json({ error: "Cannot create a signature for another agent" }, 403);
      }
    } else {
      // ORGANIZATION / DEPARTMENT signatures require admin
      if (!isAdmin) {
        return c.json({ error: "Only admins can create organization or department signatures" }, 403);
      }
    }

    const signature = await emailService.createSignature(orgId, body);
    return c.json({ data: signature }, 201);
  }

  async updateSignature(c: Context) {
    const { id } = c.req.param();
    const user = c.get("user");
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.globalRole ?? "");

    if (!isAdmin) {
      const existing = await emailService.getSignatureById(id);
      if (!existing) return c.json({ error: "Not found" }, 404);
      if (existing.signature.ownerType === "AGENT" && existing.signature.ownerId !== user?.userId) {
        return c.json({ error: "Forbidden" }, 403);
      }
    }

    const body = await c.req.json<{ name?: string; isDefault?: boolean }>();
    const updated = await emailService.updateSignature(id, body);
    return c.json({ data: updated });
  }

  async saveSignatureVersion(c: Context) {
    const { id } = c.req.param();
    const user = c.get("user");
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.globalRole ?? "");

    if (!isAdmin) {
      const existing = await emailService.getSignatureById(id);
      if (!existing) return c.json({ error: "Not found" }, 404);
      if (existing.signature.ownerType === "AGENT" && existing.signature.ownerId !== user?.userId) {
        return c.json({ error: "Forbidden" }, 403);
      }
    }

    const body = await c.req.json();
    const version = await emailService.saveSignatureVersion(id, body);
    return c.json({ data: version });
  }

  // ── Approval endpoints ────────────────────────────────────────────────

  async requestApproval(c: Context) {
    const userId = c.get("user")?.userId;
    const { versionId } = c.req.param();
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const approval = await emailService.requestTemplateApproval(versionId, userId);
    return c.json({ data: approval }, 201);
  }

  async reviewApproval(c: Context) {
    const userId = c.get("user")?.userId;
    const { approvalId } = c.req.param();
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json<{ decision: "APPROVED" | "REJECTED"; notes?: string }>();
    const approval = await emailService.reviewTemplateApproval(approvalId, userId, body.decision, body.notes);
    return c.json({ data: approval });
  }

  async listPendingApprovals(c: Context) {
    const orgId = c.get("tenantId");
    if (!orgId) return c.json({ error: "Unauthorized" }, 401);

    const pending = await emailService.listPendingApprovals(orgId);
    return c.json({ data: pending });
  }

  // ── Signature rule endpoints ──────────────────────────────────────────

  async listSignatureRules(c: Context) {
    const orgId = c.get("tenantId");
    if (!orgId) return c.json({ error: "Unauthorized" }, 401);
    return c.json({ data: await emailService.listSignatureRules(orgId) });
  }

  async createSignatureRule(c: Context) {
    const orgId = c.get("tenantId");
    if (!orgId) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    const rule = await emailService.createSignatureRule(orgId, body);
    return c.json({ data: rule }, 201);
  }

  async updateSignatureRule(c: Context) {
    const { ruleId } = c.req.param();
    const body = await c.req.json();
    const rule = await emailService.updateSignatureRule(ruleId, body);
    return c.json({ data: rule });
  }

  async deleteSignatureRule(c: Context) {
    const { ruleId } = c.req.param();
    await emailService.deleteSignatureRule(ruleId);
    return c.json({ success: true });
  }

  // ── Analytics endpoints ───────────────────────────────────────────────

  async getAnalytics(c: Context) {
    const orgId = c.get("tenantId");
    if (!orgId) return c.json({ error: "Unauthorized" }, 401);
    const data = await emailService.getAnalytics(orgId);
    return c.json({ data });
  }

  async listRecentSends(c: Context) {
    const orgId = c.get("tenantId");
    if (!orgId) return c.json({ error: "Unauthorized" }, 401);
    const sends = await emailService.listRecentSends(orgId);
    return c.json({ data: sends });
  }
}

export const emailController = new EmailController();
