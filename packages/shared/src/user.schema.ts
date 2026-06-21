import { z } from "zod";

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  globalRole: z.string(),
  status: z.string(),
  lastLoginAt: z.union([z.string(), z.date()]).nullable(),
  createdAt: z.union([z.string(), z.date()]).nullable(),
  updatedAt: z.union([z.string(), z.date()]).nullable(),
});

export const userListResponseSchema = z.array(userResponseSchema);

export type UserResponse = z.infer<typeof userResponseSchema>;

export const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  globalRole: z.string().min(1, "Role is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  globalRole: z.string().optional(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
