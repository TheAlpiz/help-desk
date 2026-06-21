ALTER TABLE "organization" ADD COLUMN "subdomain" varchar(63);--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_subdomain_unique" UNIQUE("subdomain");