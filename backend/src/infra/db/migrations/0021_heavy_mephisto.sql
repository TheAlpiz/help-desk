ALTER TABLE "session" ALTER COLUMN "reuse_detected_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "revoked_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mailbox" ALTER COLUMN "last_sync_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task" ALTER COLUMN "due_date" SET DATA TYPE timestamp with time zone;