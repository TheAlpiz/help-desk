import { db } from "../../infra/db";
import { eq, and } from "drizzle-orm";
import {
  emailBranding,
  emailTemplate,
  templateVersion,
  emailSignature,
  signatureVersion,
} from "./email.schema";
import type {
  EmailBrandingDTO,
  CreateEmailTemplateDTO,
  SaveTemplateVersionDTO,
  CreateEmailSignatureDTO,
  SaveSignatureVersionDTO,
} from "@help-desk/shared";

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
    return await db
      .select()
      .from(emailTemplate)
      .where(eq(emailTemplate.organizationId, organizationId));
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
      .where(
        and(
          eq(templateVersion.templateId, template[0].id),
          eq(templateVersion.status, "PUBLISHED")
        )
      )
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

  async listSignatures(organizationId: string) {
    return await db
      .select()
      .from(emailSignature)
      .where(eq(emailSignature.organizationId, organizationId));
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
      .where(
        and(
          eq(signatureVersion.signatureId, signature[0].id),
          eq(signatureVersion.status, "PUBLISHED")
        )
      )
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
      .where(
        and(
          eq(signatureVersion.signatureId, signatureId),
          eq(signatureVersion.status, "PUBLISHED")
        )
      )
      .orderBy((t) => t.versionNumber)
      .limit(1);

    return { signature: signature[0], version: version[version.length - 1] || null };
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
}

export const emailService = new EmailService();
