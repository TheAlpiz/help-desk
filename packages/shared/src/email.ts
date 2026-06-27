import { z } from "zod";

const hexColor = z.string().length(7).regex(/^#[0-9A-Fa-f]{6}$/);

const socialLinkSchema = z.object({
  platform: z.enum(["twitter", "linkedin", "facebook", "instagram", "youtube", "github", "tiktok"]),
  url: z.string().url(),
});

export const emailBrandingSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  // Colors
  primaryColor: hexColor.optional(),
  secondaryColor: hexColor.optional(),
  // Header
  logoUrl: z.string().url().nullable().optional(),
  headerBgColor: hexColor.optional(),
  // Font
  fontFamily: z.string().max(100).optional(),
  // Button
  buttonColor: hexColor.nullable().optional(),
  buttonBorderRadius: z.number().int().min(0).max(24).optional(),
  // Footer
  footerText: z.string().max(2000).nullable().optional(),
  footerBgColor: hexColor.optional(),
  // Company info
  companyAddress: z.string().max(500).nullable().optional(),
  companyPhone: z.string().max(50).nullable().optional(),
  unsubscribeText: z.string().max(500).nullable().optional(),
  // Social links
  socialLinks: z.array(socialLinkSchema).optional(),
  // Misc
  darkModeEnabled: z.boolean().optional(),
  removeHelpdeskBranding: z.boolean().optional(),
});

export const createEmailTemplateSchema = z.object({
  templateType: z.string().max(50),
  name: z.string().max(255),
  description: z.string().nullable().optional(),
  language: z.string().max(10).optional(),
});

export const saveTemplateVersionSchema = z.object({
  subject: z.string().min(1, "validation.subjectRequired"),
  bodyHtml: z.string().min(1, "validation.htmlBodyRequired"),
  bodyPlain: z.string().min(1, "validation.plainTextRequired"),
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
  contentHtml: z.string().min(1, "validation.htmlContentRequired"),
  contentPlain: z.string().optional(),
  contentJson: z.any().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export type EmailBrandingDTO = z.infer<typeof emailBrandingSchema>;
export type CreateEmailTemplateDTO = z.infer<typeof createEmailTemplateSchema>;
export type SaveTemplateVersionDTO = z.infer<typeof saveTemplateVersionSchema>;
export type CreateEmailSignatureDTO = z.infer<typeof createEmailSignatureSchema>;
export type SaveSignatureVersionDTO = z.infer<typeof saveSignatureVersionSchema>;
