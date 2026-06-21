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
