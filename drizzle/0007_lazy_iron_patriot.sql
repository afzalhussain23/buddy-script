ALTER TABLE "posts" RENAME COLUMN "image_url" TO "image_object_key";--> statement-breakpoint
UPDATE "posts" p
SET "image_object_key" = iu."published_object_key"
FROM "image_uploads" iu
WHERE iu."attached_post_id" = p."id";--> statement-breakpoint
UPDATE "posts"
SET "image_object_key" = substring("image_object_key" from '(posts/[^?#]+)')
WHERE "image_object_key" IS NOT NULL
  AND "image_object_key" !~ '^posts/';--> statement-breakpoint
ALTER TABLE "image_uploads" DROP CONSTRAINT "image_uploads_public_url_unique";--> statement-breakpoint
DROP INDEX "posts_image_url_unique_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "posts_image_object_key_unique_idx" ON "posts" USING btree ("image_object_key") WHERE "posts"."image_object_key" is not null;--> statement-breakpoint
ALTER TABLE "image_uploads" DROP COLUMN "public_url";
