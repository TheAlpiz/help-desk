import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z.string().min(1).max(1024),
  initialMessage: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(["open", "assigned", "in_progress", "waiting_customer", "resolved", "closed", "reopened"]),
});

export const addMessageSchema = z.object({
  content: z.string().min(1),
  type: z.enum(["PUBLIC_REPLY", "INTERNAL_NOTE"]).default("PUBLIC_REPLY"),
  emailMessageId: z.string().max(512).optional(),
});

export const assignTicketSchema = z.object({
  assigneeId: z.string().uuid(),
});

export const mergeTicketSchema = z.object({
  targetTicketId: z.string().uuid(),
});

export const updatePrioritySchema = z.object({
  priority: z.enum(["low", "medium", "high", "critical"]),
});

// Generic field update (subject / department reassignment)
export const updateTicketSchema = z
  .object({
    subject: z.string().min(1).max(1024).optional(),
    departmentId: z.string().uuid().nullable().optional(),
  })
  .refine((d) => d.subject !== undefined || d.departmentId !== undefined, {
    message: "At least one field must be provided",
  });

export const TICKET_LINK_TYPES = ["RELATES_TO", "BLOCKS", "DUPLICATE_OF", "MERGED_INTO"] as const;

export const linkTicketSchema = z.object({
  targetTicketId: z.string().uuid(),
  linkType: z.enum(TICKET_LINK_TYPES).default("RELATES_TO"),
});

export const addTagSchema = z.object({
  name: z.string().min(1).max(50),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type AddMessageInput = z.infer<typeof addMessageSchema>;
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
export type MergeTicketInput = z.infer<typeof mergeTicketSchema>;
export type UpdatePriorityInput = z.infer<typeof updatePrioritySchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type LinkTicketInput = z.infer<typeof linkTicketSchema>;
export type AddTagInput = z.infer<typeof addTagSchema>;

export const addCcSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type AddCcInput = z.infer<typeof addCcSchema>;
