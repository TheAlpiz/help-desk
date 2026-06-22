import { Context } from "hono";
import { emailService } from "./email.service";

export class EmailController {
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
    const userId = c.get("user")?.id;
    const { id } = c.req.param();
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const version = await emailService.saveTemplateVersion(id, body, userId);
    return c.json({ data: version });
  }

  async listSignatures(c: Context) {
    const orgId = c.get("tenantId");
    if (!orgId) return c.json({ error: "Unauthorized" }, 401);

    const signatures = await emailService.listSignatures(orgId);
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
    const signature = await emailService.getSignatureById(id);
    if (!signature) return c.json({ error: "Not found" }, 404);
    return c.json({ data: signature });
  }

  async createSignature(c: Context) {
    const orgId = c.get("tenantId");
    if (!orgId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const signature = await emailService.createSignature(orgId, body);
    return c.json({ data: signature }, 201);
  }

  async saveSignatureVersion(c: Context) {
    const { id } = c.req.param();
    const body = await c.req.json();
    
    const version = await emailService.saveSignatureVersion(id, body);
    return c.json({ data: version });
  }
}

export const emailController = new EmailController();
