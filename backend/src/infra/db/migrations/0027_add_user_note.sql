CREATE TABLE "user_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255),
	"content" text DEFAULT '' NOT NULL,
	"reminder_at" timestamp with time zone,
	"reminder_fired" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "user_note" ADD CONSTRAINT "user_note_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note" ADD CONSTRAINT "user_note_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_note_user_idx" ON "user_note" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_note_org_idx" ON "user_note" USING btree ("organization_id");