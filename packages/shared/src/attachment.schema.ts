import { z } from "zod";

export const uploadRequestSchema = z.object({
  entityType: z.enum(["TICKET", "TICKET_MESSAGE", "TASK", "EMAIL", "CHAT_MESSAGE"]),
  entityId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  mimeType: z.string().max(100),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024), // 50MB max
});

export const confirmUploadSchema = z.object({
  storageKey: z.string(),
});

export type UploadRequestInput = z.infer<typeof uploadRequestSchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
