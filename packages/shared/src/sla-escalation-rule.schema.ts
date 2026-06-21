import { z } from "zod";

export const SLA_ESCALATION_CONDITIONS = [
  "breach_imminent",
  "first_breach",
  "repeated_breach",
  "no_response",
] as const;

export const SLA_ESCALATION_ACTIONS = [
  "notify_agent",
  "notify_manager",
  "reassign",
  "add_tag",
  "increase_priority",
] as const;

export const slaEscalationActionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(SLA_ESCALATION_ACTIONS),
  value: z.string().default(""),
});

export const createSlaEscalationRuleSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  condition: z.enum(SLA_ESCALATION_CONDITIONS),
  thresholdMinutes: z.number().int().min(0).optional(),
  actions: z.array(slaEscalationActionSchema).min(1, "At least one action is required"),
  isActive: z.boolean().default(true),
});

export const updateSlaEscalationRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  condition: z.enum(SLA_ESCALATION_CONDITIONS).optional(),
  thresholdMinutes: z.number().int().min(0).nullable().optional(),
  actions: z.array(slaEscalationActionSchema).optional(),
  isActive: z.boolean().optional(),
});

export type SlaEscalationCondition = (typeof SLA_ESCALATION_CONDITIONS)[number];
export type SlaEscalationActionType = (typeof SLA_ESCALATION_ACTIONS)[number];
export type SlaEscalationAction = z.infer<typeof slaEscalationActionSchema>;
export type CreateSlaEscalationRuleInput = z.infer<typeof createSlaEscalationRuleSchema>;
export type UpdateSlaEscalationRuleInput = z.infer<typeof updateSlaEscalationRuleSchema>;
