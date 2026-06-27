import { z } from "zod";

export const departmentResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.union([z.string(), z.date()]).nullable(),
  updatedAt: z.union([z.string(), z.date()]).nullable(),
});

export const departmentListResponseSchema = z.array(departmentResponseSchema);

export type DepartmentResponse = z.infer<typeof departmentResponseSchema>;

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "validation.nameRequired").max(255),
  description: z.string().max(500).optional().nullable(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const addDepartmentMemberSchema = z.object({
  userId: z.string().uuid(),
});

export type AddDepartmentMemberInput = z.infer<typeof addDepartmentMemberSchema>;
