import { db } from "../../infra/db";
import { eq, and, asc, desc, or } from "drizzle-orm";
import {
  emailBranding,
  emailTemplate,
  templateVersion,
  emailSignature,
  signatureVersion,
  templateApproval,
  signatureRule,
  emailSend,
} from "./email.schema";
import { getEmailAnalytics } from "./email-tracking";
import type {
  EmailBrandingDTO,
  CreateEmailTemplateDTO,
  SaveTemplateVersionDTO,
  CreateEmailSignatureDTO,
  SaveSignatureVersionDTO,
} from "@help-desk/shared";

// App-global auth emails (password reset, verification, welcome) are owned by the
// platform and sent via the hardcoded templates in lib/email-templates.ts. They
// must not be authored or visible per-organization.
export const RESERVED_GLOBAL_TEMPLATE_TYPES = ["password_reset", "email_verification", "welcome", "org_invitation"];

export class EmailService {
  async getBranding(organizationId: string) {
    const results = await db
      .select()
      .from(emailBranding)
      .where(eq(emailBranding.organizationId, organizationId));
    return results[0] || null;
  }

  async updateBranding(organizationId: string, data: Partial<EmailBrandingDTO>) {
    const existing = await this.getBranding(organizationId);
    if (existing) {
      const [updated] = await db
        .update(emailBranding)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(emailBranding.organizationId, organizationId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(emailBranding)
        .values({
          organizationId,
          primaryColor: data.primaryColor ?? "#2563eb",
          fontFamily: data.fontFamily ?? "Inter, sans-serif",
          logoUrl: data.logoUrl ?? null,
          removeHelpdeskBranding: data.removeHelpdeskBranding ?? false,
        })
        .returning();
      return created;
    }
  }

  async listTemplates(organizationId: string) {
    const rows = await db
      .select()
      .from(emailTemplate)
      .where(eq(emailTemplate.organizationId, organizationId));
    // Hide reserved app-global types in case any legacy rows exist.
    return rows.filter((t) => !RESERVED_GLOBAL_TEMPLATE_TYPES.includes(t.templateType));
  }

  async createTemplate(organizationId: string, templateType: string, name: string) {
    if (RESERVED_GLOBAL_TEMPLATE_TYPES.includes(templateType)) {
      throw new Error("This template type is managed globally and cannot be edited per organization");
    }
    const [template] = await db
      .insert(emailTemplate)
      .values({ organizationId, templateType, name })
      .returning();
    return template;
  }

  async getActiveTemplateVersion(organizationId: string, templateType: string) {
    const template = await db
      .select()
      .from(emailTemplate)
      .where(
        and(
          eq(emailTemplate.organizationId, organizationId),
          eq(emailTemplate.templateType, templateType)
        )
      )
      .limit(1);

    if (!template.length) return null;

    const version = await db
      .select()
      .from(templateVersion)
      .where(eq(templateVersion.templateId, template[0].id))
      .orderBy(desc(templateVersion.versionNumber))
      .limit(1);

    return { template: template[0], version: version[0] || null };
  }

  async saveTemplateVersion(templateId: string, data: SaveTemplateVersionDTO, userId: string) {
    // Get highest version number
    const versions = await db
      .select()
      .from(templateVersion)
      .where(eq(templateVersion.templateId, templateId))
      .orderBy((t) => t.versionNumber);

    const highestVersion = versions.length > 0 ? versions[versions.length - 1].versionNumber : 0;

    const [version] = await db
      .insert(templateVersion)
      .values({
        templateId,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        bodyPlain: data.bodyPlain,
        contentJson: data.contentJson ?? null,
        versionNumber: highestVersion + 1,
        status: data.status || "DRAFT",
        createdById: userId,
      })
      .returning();

    return version;
  }

  async listSignatures(organizationId: string, callerId: string, isAdmin: boolean) {
    if (isAdmin) {
      return db.select().from(emailSignature).where(eq(emailSignature.organizationId, organizationId));
    }
    // Regular users see their own personal signature + org-wide signatures
    return db.select().from(emailSignature).where(
      and(
        eq(emailSignature.organizationId, organizationId),
        or(
          eq(emailSignature.ownerType, "ORGANIZATION"),
          and(
            eq(emailSignature.ownerType, "AGENT"),
            eq(emailSignature.ownerId, callerId)
          )
        )
      )
    );
  }

  async getSignature(organizationId: string, ownerType: string, ownerId: string) {
    const signature = await db
      .select()
      .from(emailSignature)
      .where(
        and(
          eq(emailSignature.organizationId, organizationId),
          eq(emailSignature.ownerType, ownerType),
          eq(emailSignature.ownerId, ownerId)
        )
      )
      .limit(1);

    if (!signature.length) return null;

    const version = await db
      .select()
      .from(signatureVersion)
      .where(eq(signatureVersion.signatureId, signature[0].id))
      .orderBy(desc(signatureVersion.versionNumber))
      .limit(1);

    return { signature: signature[0], version: version[0] || null };
  }

  async getSignatureById(signatureId: string) {
    const signature = await db
      .select()
      .from(emailSignature)
      .where(eq(emailSignature.id, signatureId))
      .limit(1);

    if (!signature.length) return null;

    const version = await db
      .select()
      .from(signatureVersion)
      .where(eq(signatureVersion.signatureId, signatureId))
      .orderBy(desc(signatureVersion.versionNumber))
      .limit(1);

    return { signature: signature[0], version: version[0] || null };
  }

  async createSignature(organizationId: string, data: CreateEmailSignatureDTO) {
    const [signature] = await db
      .insert(emailSignature)
      .values({
        organizationId,
        ownerType: data.ownerType,
        ownerId: data.ownerId,
        name: data.name,
        isDefault: data.isDefault ?? false,
      })
      .returning();
    return signature;
  }

  async updateSignature(signatureId: string, data: { name?: string; isDefault?: boolean }) {
    const [updated] = await db
      .update(emailSignature)
      .set({ ...(data.name !== undefined && { name: data.name }), ...(data.isDefault !== undefined && { isDefault: data.isDefault }) })
      .where(eq(emailSignature.id, signatureId))
      .returning();
    return updated;
  }

  async saveSignatureVersion(signatureId: string, data: SaveSignatureVersionDTO) {
    const versions = await db
      .select()
      .from(signatureVersion)
      .where(eq(signatureVersion.signatureId, signatureId))
      .orderBy((t) => t.versionNumber);

    const highestVersion = versions.length > 0 ? versions[versions.length - 1].versionNumber : 0;

    const [version] = await db
      .insert(signatureVersion)
      .values({
        signatureId,
        contentHtml: data.contentHtml,
        contentPlain: data.contentPlain ?? "",
        contentJson: data.contentJson ?? null,
        versionNumber: highestVersion + 1,
        status: data.status || "PUBLISHED",
      })
      .returning();

    return version;
  }

  // ── Approval workflows ────────────────────────────────────────────────

  async requestTemplateApproval(templateVersionId: string, requestedById: string) {
    const [approval] = await db
      .insert(templateApproval)
      .values({ templateVersionId, requestedById, status: "PENDING" })
      .returning();
    // Mark version as pending approval
    await db
      .update(templateVersion)
      .set({ status: "PENDING_APPROVAL" })
      .where(eq(templateVersion.id, templateVersionId));
    return approval;
  }

  async reviewTemplateApproval(
    approvalId: string,
    reviewedById: string,
    decision: "APPROVED" | "REJECTED",
    notes?: string,
  ) {
    const [approval] = await db
      .update(templateApproval)
      .set({ status: decision, reviewedById, notes: notes ?? null, reviewedAt: new Date() })
      .where(eq(templateApproval.id, approvalId))
      .returning();

    // If approved → publish the version; if rejected → revert to DRAFT
    await db
      .update(templateVersion)
      .set({ status: decision === "APPROVED" ? "PUBLISHED" : "DRAFT" })
      .where(eq(templateVersion.id, approval.templateVersionId));

    return approval;
  }

  async listPendingApprovals(organizationId: string) {
    return db
      .select({
        approval: templateApproval,
        version: templateVersion,
        template: emailTemplate,
      })
      .from(templateApproval)
      .innerJoin(templateVersion, eq(templateApproval.templateVersionId, templateVersion.id))
      .innerJoin(emailTemplate, eq(templateVersion.templateId, emailTemplate.id))
      .where(
        and(
          eq(emailTemplate.organizationId, organizationId),
          eq(templateApproval.status, "PENDING"),
        ),
      )
      .orderBy(desc(templateApproval.createdAt));
  }

  // ── Signature rules ───────────────────────────────────────────────────

  async listSignatureRules(organizationId: string) {
    return db
      .select()
      .from(signatureRule)
      .where(eq(signatureRule.organizationId, organizationId))
      .orderBy(asc(signatureRule.priority));
  }

  async createSignatureRule(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      priority?: number;
      conditions: Array<{ field: string; op: string; value: string | string[] }>;
      signatureId: string;
    },
  ) {
    const [rule] = await db
      .insert(signatureRule)
      .values({
        organizationId,
        name: data.name,
        description: data.description ?? null,
        priority: data.priority ?? 0,
        conditions: data.conditions,
        signatureId: data.signatureId,
      })
      .returning();
    return rule;
  }

  async updateSignatureRule(
    ruleId: string,
    data: Partial<{
      name: string;
      description: string;
      priority: number;
      conditions: Array<{ field: string; op: string; value: string | string[] }>;
      signatureId: string;
      isActive: boolean;
    }>,
  ) {
    const [rule] = await db
      .update(signatureRule)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(signatureRule.id, ruleId))
      .returning();
    return rule;
  }

  async deleteSignatureRule(ruleId: string) {
    await db.delete(signatureRule).where(eq(signatureRule.id, ruleId));
  }

  // ── Analytics ─────────────────────────────────────────────────────────

  async getAnalytics(organizationId: string, options?: { templateType?: string; fromDate?: Date; toDate?: Date }) {
    return getEmailAnalytics(organizationId, options);
  }

  async listRecentSends(organizationId: string, limit = 50) {
    return db
      .select()
      .from(emailSend)
      .where(eq(emailSend.organizationId, organizationId))
      .orderBy(desc(emailSend.sentAt))
      .limit(limit);
  }
}

export const emailService = new EmailService();
