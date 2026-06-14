DROP INDEX "posts_feed_id_idx";--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3);--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
CREATE INDEX "posts_feed_created_idx" ON "posts" USING btree ("created_at" desc,"id" desc) WHERE "posts"."deleted_at" is null;