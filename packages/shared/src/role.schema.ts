import { z } from "zod";

export const roleResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  isSystem: z.boolean(),
  createdAt: z.union([z.string(), z.date()]).nullable(),
  updatedAt: z.union([z.string(), z.date()]).nullable(),
});

export const roleListResponseSchema = z.array(roleResponseSchema);

export type RoleResponse = z.infer<typeof roleResponseSchema>;

export const createRoleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().nullable(),
});

export const updateRoleSchema = createRoleSchema.partial();

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
