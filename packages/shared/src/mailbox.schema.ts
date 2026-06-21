import { z } from "zod";

export const createMailboxSchema = z.object({
  organizationId: z.string().uuid(),
  emailAddress: z.string().email("Invalid email address"),
  imapHost: z.string().min(1, "IMAP host required").optional(),
  imapPort: z.number().int().min(1).max(65535).optional(),
  imapUser: z.string().optional(),
  imapPassword: z.string().optional(),
  imapSecure: z.boolean().default(true),
  smtpHost: z.string().min(1, "SMTP host required").optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpSecure: z.boolean().default(true),
});

export const updateMailboxSchema = createMailboxSchema.partial().omit({ organizationId: true });

export type CreateMailboxInput = z.infer<typeof createMailboxSchema>;
export type UpdateMailboxInput = z.infer<typeof updateMailboxSchema>;
