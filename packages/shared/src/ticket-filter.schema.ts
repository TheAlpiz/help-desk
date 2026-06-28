import { z } from "zod";

// Inbound ticket filter rules. When an incoming ticket matches an active rule,
// it is dropped (never created). Managed by organization admins / super admins.
export const TICKET_FILTER_FIELDS = [
  "sender_email",     // exact match on the requester/sender email
  "sender_domain",    // match the domain part (e.g. "spam.com" or "@spam.com")
  "subject_contains", // case-insensitive substring of the subject
] as const;

export const TICKET_FILTER_ACTIONS = [
  "drop", // discard the inbound ticket entirely
] as const;

export const createTicketFilterSchema = z.object({
  name: z.string().min(1, "validation.nameRequired").max(255),
  field: z.enum(TICKET_FILTER_FIELDS),
  value: z.string().min(1, "validation.valueRequired").max(512),
  action: z.enum(TICKET_FILTER_ACTIONS).default("drop"),
  isActive: z.boolean().default(true),
});

export const updateTicketFilterSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  field: z.enum(TICKET_FILTER_FIELDS).optional(),
  value: z.string().min(1).max(512).optional(),
  action: z.enum(TICKET_FILTER_ACTIONS).optional(),
  isActive: z.boolean().optional(),
});

export type TicketFilterField = (typeof TICKET_FILTER_FIELDS)[number];
export type TicketFilterAction = (typeof TICKET_FILTER_ACTIONS)[number];
export type CreateTicketFilterInput = z.infer<typeof createTicketFilterSchema>;
export type UpdateTicketFilterInput = z.infer<typeof updateTicketFilterSchema>;
