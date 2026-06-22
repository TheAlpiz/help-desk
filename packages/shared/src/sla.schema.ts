import { z } from "zod";

export const createSlaSchema = z.object({
  name: z.string().min(1).max(255),
  firstResponseTimeMins: z.number().int().positive(),
  resolutionTimeMins: z.number().int().positive(),
  departmentId: z.string().uuid().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).nullable().optional(),
  businessHoursConfig: z.object({
    enabled: z.boolean(),
    timezone: z.string().optional(),
    workDays: z.array(z.number()).optional(),
    startHour: z.string().optional(),
    endHour: z.string().optional(),
  }).optional(),
});

export const updateSlaSchema = createSlaSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createSlaEscalationSchema = z.object({
  slaId: z.string().uuid(),
  breachType: z.enum(["FIRST_RESPONSE", "RESOLUTION"]),
  actionType: z.enum(["REASSIGN", "BUMP_PRIORITY", "NOTIFY_MANAGER"]),
  targetId: z.string().uuid().optional().nullable(),
});

export type CreateSlaInput = z.infer<typeof createSlaSchema>;
export type UpdateSlaInput = z.infer<typeof updateSlaSchema>;
export type CreateSlaEscalationInput = z.infer<typeof createSlaEscalationSchema>;

export const slaResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  firstResponseTimeMins: z.number().int(),
  resolutionTimeMins: z.number().int(),
  businessHoursConfig: z.any().nullable(),
  isActive: z.boolean(),
  createdAt: z.union([z.string(), z.date()]).nullable(),
  updatedAt: z.union([z.string(), z.date()]).nullable(),
});

export const slaListResponseSchema = z.array(slaResponseSchema);

export type SlaResponse = z.infer<typeof slaResponseSchema>;
