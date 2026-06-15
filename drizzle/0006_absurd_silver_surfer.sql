ALTER TABLE "user" ADD COLUMN "accepted_terms" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "terms_accepted_at" timestamp;