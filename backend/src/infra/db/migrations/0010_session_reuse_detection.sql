ALTER TABLE "session" ADD COLUMN "rotated_to_token_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "reuse_detected_at" timestamp;