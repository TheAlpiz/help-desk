import { z } from "zod";

/**
 * Discord-style availability the user sets for themselves. Drives ticket
 * auto-assignment weighting (see backend assignment.service):
 *   active_duty    — actively taking work; weighted highest
 *   available      — normal weight
 *   away / do_not_disturb — eligible but de-prioritised
 *   not_available  — excluded from auto-assignment entirely
 */
export const AVAILABILITY_STATUSES = [
  "active_duty",
  "available",
  "away",
  "do_not_disturb",
  "not_available",
] as const;

export const availabilitySchema = z.enum(AVAILABILITY_STATUSES);
export type Availability = z.infer<typeof availabilitySchema>;

export const updateAvailabilitySchema = z.object({
  availability: availabilitySchema,
});
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  globalRole: z.string(),
  status: z.string(),
  availability: availabilitySchema.default("available"),
  lastLoginAt: z.union([z.string(), z.date()]).nullable(),
  createdAt: z.union([z.string(), z.date()]).nullable(),
  updatedAt: z.union([z.string(), z.date()]).nullable(),
});

export const userListResponseSchema = z.array(userResponseSchema);

export type UserResponse = z.infer<typeof userResponseSchema>;

export const inviteUserSchema = z.object({
  email: z.string().email("validation.email"),
  firstName: z.string().min(1, "validation.firstNameRequired").max(100),
  lastName: z.string().min(1, "validation.lastNameRequired").max(100),
  globalRole: z.string().min(1, "validation.roleRequired"),
  password: z.string().min(8, "validation.passwordMin8"),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  globalRole: z.string().optional(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
