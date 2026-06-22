import { z } from "zod";

export const organizationResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  domain: z.string(),
  status: z.string(),
  createdAt: z.union([z.string(), z.date()]).nullable(),
  updatedAt: z.union([z.string(), z.date()]).nullable(),
});

export const organizationListResponseSchema = z.array(organizationResponseSchema);

export type OrganizationResponse = z.infer<typeof organizationResponseSchema>;

export const updateOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).optional(),
  domain: z.string().min(1, "Domain is required").max(255).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().min(1).max(255),
  status: z.enum(["active", "suspended"]).default("active"),
});

export const provisionOrganizationSchema = z.object({
  org: z.object({
    name: z.string().min(1).max(255),
    domain: z.string().min(1).max(255),
    status: z.string().optional(),
  }),
  admin: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type ProvisionOrganizationInput = z.infer<typeof provisionOrganizationSchema>;

const dayScheduleSchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
});

export const businessHoursConfigSchema = z.object({
  timezone: z.string().min(1),
  days: z.object({
    Monday: dayScheduleSchema,
    Tuesday: dayScheduleSchema,
    Wednesday: dayScheduleSchema,
    Thursday: dayScheduleSchema,
    Friday: dayScheduleSchema,
    Saturday: dayScheduleSchema,
    Sunday: dayScheduleSchema,
  }),
});

export type BusinessHoursConfig = z.infer<typeof businessHoursConfigSchema>;

// Branding. Logo is a data URL (small images only); brand color is a #rrggbb hex.
export const brandingConfigSchema = z.object({
  logoUrl: z
    .string()
    .max(2_500_000, "Logo too large (max ~2MB)")
    .nullable()
    .optional(),
  supportEmail: z
    .string()
    .email("Invalid email")
    .or(z.literal(""))
    .nullable()
    .optional(),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a #rrggbb hex color")
    .nullable()
    .optional(),
});

export type BrandingConfig = z.infer<typeof brandingConfigSchema>;

export const dataRetentionConfigSchema = z.object({
  auditLogRetentionDays: z.number().int().min(1).default(365),
  ticketRetentionDays: z.number().int().min(1).default(730),
  attachmentRetentionDays: z.number().int().min(1).default(365),
  isAutoArchivalEnabled: z.boolean().default(false),
});

export type DataRetentionConfig = z.infer<typeof dataRetentionConfigSchema>;
