ALTER TABLE "email_branding" ADD COLUMN "secondary_color" varchar(7) DEFAULT '#64748b' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_branding" ADD COLUMN "header_bg_color" varchar(7) DEFAULT '#ffffff' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_branding" ADD COLUMN "button_color" varchar(7);--> statement-breakpoint
ALTER TABLE "email_branding" ADD COLUMN "button_border_radius" integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE "email_branding" ADD COLUMN "footer_text" text;--> statement-breakpoint
ALTER TABLE "email_branding" ADD COLUMN "footer_bg_color" varchar(7) DEFAULT '#f8fafc' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_branding" ADD COLUMN "company_address" text;--> statement-breakpoint
ALTER TABLE "email_branding" ADD COLUMN "company_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "email_branding" ADD COLUMN "unsubscribe_text" text;--> statement-breakpoint
ALTER TABLE "email_branding" ADD COLUMN "social_links" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "email_branding" ADD COLUMN "dark_mode_enabled" boolean DEFAULT false NOT NULL;