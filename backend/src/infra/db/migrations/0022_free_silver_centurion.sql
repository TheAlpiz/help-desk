ALTER TABLE "ticket" ADD COLUMN "source" varchar(20) DEFAULT 'portal' NOT NULL;
--> statement-breakpoint
-- Backfill: tickets with a contact originated from email (same heuristic the
-- automation engine used before this column existed).
UPDATE "ticket" SET "source" = 'email' WHERE "contact_id" IS NOT NULL;