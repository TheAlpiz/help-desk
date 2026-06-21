import { z } from "zod";

export const updateNotificationPreferenceSchema = z.union([
  z.object({
    channel: z.enum(["IN_APP", "EMAIL", "SMS", "PUSH"]),
    eventTypes: z.array(z.string()),
  }),
  z.object({
    eventKey: z.string().min(1),
    channel: z.enum(["IN_APP", "EMAIL", "SMS", "PUSH"]),
    enabled: z.boolean(),
  }),
]);

export const markNotificationReadSchema = z.object({
  isRead: z.boolean(),
});

export type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>;
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;
