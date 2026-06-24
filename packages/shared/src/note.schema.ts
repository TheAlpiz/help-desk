import { z } from "zod";

// Personal notes are private to their owner. A note may optionally carry a
// reminder; when it fires the user gets the same in-app notification (and sound)
// as an incoming ticket.

export const createNoteSchema = z.object({
  title: z.string().max(255).optional(),
  content: z.string().max(10_000).default(""),
  // ISO datetime in the future; null/omitted = no reminder.
  reminderAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().max(255).nullable().optional(),
  content: z.string().max(10_000).optional(),
  reminderAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
