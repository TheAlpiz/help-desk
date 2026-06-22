import { z } from "zod";

export const emailBrandingSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  primaryColor: z.string().length(7).regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fontFamily: z.string().max(100).optional(),
  logoUrl: z.string().url().nullable().optional(),
  removeHelpdeskBranding: z.boolean().optional(),
});

export const createEmailTemplateSchema = z.object({
  templateType: z.string().max(50),
  name: z.string().max(255),
  description: z.string().nullable().optional(),
  language: z.string().max(10).optional(),
});

export const saveTemplateVersionSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  bodyHtml: z.string().min(1, "HTML Body is required"),
  bodyPlain: z.string().min(1, "Plain text body is required"),
  contentJson: z.any().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export const createEmailSignatureSchema = z.object({
  ownerType: z.enum(["ORGANIZATION", "DEPARTMENT", "AGENT"]),
  ownerId: z.string().uuid(),
  name: z.string().max(255),
  isDefault: z.boolean().optional(),
});

export const saveSignatureVersionSchema = z.object({
  contentHtml: z.string().min(1, "HTML content is required"),
  contentPlain: z.string().optional(),
  contentJson: z.any().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export type EmailBrandingDTO = z.infer<typeof emailBrandingSchema>;
export type CreateEmailTemplateDTO = z.infer<typeof createEmailTemplateSchema>;
export type SaveTemplateVersionDTO = z.infer<typeof saveTemplateVersionSchema>;
export type CreateEmailSignatureDTO = z.infer<typeof createEmailSignatureSchema>;
export type SaveSignatureVersionDTO = z.infer<typeof saveSignatureVersionSchema>;
