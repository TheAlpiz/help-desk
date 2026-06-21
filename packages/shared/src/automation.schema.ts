import { z } from "zod";

export const AUTOMATION_TRIGGERS = [
  "ticket_created",
  "ticket_updated",
  "ticket_assigned",
  "reply_received",
  "sla_breached",
  "tag_added",
] as const;

export const AUTOMATION_CONDITION_FIELDS = [
  "status",
  "priority",
  "tag",
  "assignee",
  "department",
  "subject_contains",
] as const;

export const AUTOMATION_CONDITION_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "is_empty",
  "is_not_empty",
] as const;

export const AUTOMATION_ACTION_TYPES = [
  "set_status",
  "set_priority",
  "assign_to",
  "set_department",
  "add_tag",
  "remove_tag",
  "send_email",
  "add_note",
  "create_task",
] as const;

export const automationConditionSchema = z.object({
  id: z.string().min(1),
  field: z.enum(AUTOMATION_CONDITION_FIELDS),
  operator: z.enum(AUTOMATION_CONDITION_OPERATORS),
  value: z.string().default(""),
});

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const automationActionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(AUTOMATION_ACTION_TYPES),
  value: z.string().default(""),
  // Extra config used by create_task (ignored by other action types).
  assignee: z.string().optional(),          // user UUID or email
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueInDays: z.number().int().min(0).max(365).optional(), // relative to fire time
});

export const createAutomationSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
  trigger: z.enum(AUTOMATION_TRIGGERS),
  conditions: z.array(automationConditionSchema).default([]),
  actions: z.array(automationActionSchema).min(1, "At least one action is required"),
  conditionMatch: z.enum(["all", "any"]).default("all"),
});

export const updateAutomationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  trigger: z.enum(AUTOMATION_TRIGGERS).optional(),
  conditions: z.array(automationConditionSchema).optional(),
  actions: z.array(automationActionSchema).optional(),
  conditionMatch: z.enum(["all", "any"]).optional(),
  isActive: z.boolean().optional(),
});

export type AutomationTrigger = typeof AUTOMATION_TRIGGERS[number];
export type AutomationConditionField = typeof AUTOMATION_CONDITION_FIELDS[number];
export type AutomationCondition = z.infer<typeof automationConditionSchema>;
export type AutomationAction = z.infer<typeof automationActionSchema>;
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;
export type UpdateAutomationInput = z.infer<typeof updateAutomationSchema>;
