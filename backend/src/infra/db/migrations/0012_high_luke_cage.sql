ALTER TABLE "sla" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "sla" ADD COLUMN "priority" varchar(50);--> statement-breakpoint
ALTER TABLE "sla" ADD CONSTRAINT "sla_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE set null ON UPDATE no action;