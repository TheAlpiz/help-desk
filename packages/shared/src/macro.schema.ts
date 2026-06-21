import { z } from "zod";

export const macroActionSchema = z.object({
  type: z.enum(["set_status", "set_priority", "add_tag", "remove_tag", "assign_to", "send_reply", "add_note"]),
  value: z.string().max(2000).default(""),
});

export const createMacroSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
  actions: z.array(macroActionSchema).min(1, "At least one action is required"),
});

export const updateMacroSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  actions: z.array(macroActionSchema).optional(),
  isActive: z.boolean().optional(),
});

export const applyMacroSchema = z.object({
  ticketId: z.string().uuid("ticketId must be a valid UUID"),
});

export type MacroAction = z.infer<typeof macroActionSchema>;
export type CreateMacroInput = z.infer<typeof createMacroSchema>;
export type UpdateMacroInput = z.infer<typeof updateMacroSchema>;
export type ApplyMacroInput = z.infer<typeof applyMacroSchema>;
