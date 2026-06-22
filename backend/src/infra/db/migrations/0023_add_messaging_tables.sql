CREATE TABLE "conversation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "type" varchar(20) DEFAULT 'direct' NOT NULL,
  "name" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "conversation_participant" (
  "conversation_id" uuid NOT NULL REFERENCES "conversation"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("conversation_id", "user_id")
);
--> statement-breakpoint
CREATE TABLE "chat_message" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL REFERENCES "conversation"("id") ON DELETE CASCADE,
  "sender_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "conversation_org_idx" ON "conversation" ("organization_id");
--> statement-breakpoint
CREATE INDEX "conv_participant_user_idx" ON "conversation_participant" ("user_id");
--> statement-breakpoint
CREATE INDEX "chat_message_conv_time_idx" ON "chat_message" ("conversation_id", "created_at" DESC);
