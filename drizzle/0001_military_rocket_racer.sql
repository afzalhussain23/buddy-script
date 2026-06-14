DROP INDEX "posts_created_at_id_idx";--> statement-breakpoint
CREATE INDEX "posts_feed_id_idx" ON "posts" USING btree ("id" desc) WHERE "posts"."deleted_at" is null;