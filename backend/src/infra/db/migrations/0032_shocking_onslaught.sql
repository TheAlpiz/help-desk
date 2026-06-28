CREATE TABLE "github_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"delivery_id" varchar(128) NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"action" varchar(64),
	"task_github_link_id" uuid,
	"payload_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_installation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"installation_id" varchar(64) NOT NULL,
	"account_login" varchar(255),
	"account_type" varchar(32),
	"token_encrypted" text,
	"token_expires_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "task_github_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"installation_id" uuid NOT NULL,
	"repo_full_name" varchar(255) NOT NULL,
	"repo_id" bigint NOT NULL,
	"branch_name" varchar(255) NOT NULL,
	"base_branch" varchar(255),
	"base_sha" varchar(64),
	"branch_url" text,
	"pr_number" integer,
	"pr_url" text,
	"last_event_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "github_event" ADD CONSTRAINT "github_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_event" ADD CONSTRAINT "github_event_task_github_link_id_task_github_link_id_fk" FOREIGN KEY ("task_github_link_id") REFERENCES "public"."task_github_link"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installation" ADD CONSTRAINT "github_installation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_github_link" ADD CONSTRAINT "task_github_link_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_github_link" ADD CONSTRAINT "task_github_link_installation_id_github_installation_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."github_installation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "github_event_delivery_id_uq" ON "github_event" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "github_event_org_idx" ON "github_event" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "github_installation_org_idx" ON "github_installation" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "github_installation_installation_id_uq" ON "github_installation" USING btree ("installation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_github_link_task_id_uq" ON "task_github_link" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_github_link_branch_idx" ON "task_github_link" USING btree ("repo_id","branch_name");