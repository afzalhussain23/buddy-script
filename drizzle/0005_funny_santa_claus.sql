ALTER TABLE "posts" ADD COLUMN "image_width" integer;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "image_height" integer;--> statement-breakpoint
UPDATE "posts" SET "image_width" = 600, "image_height" = 400 WHERE "image_url" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_image_dimensions_check" CHECK (("posts"."image_width" is null and "posts"."image_height" is null) or ("posts"."image_width" between 1 and 16384 and "posts"."image_height" between 1 and 16384 and "posts"."image_width" * "posts"."image_height" <= 40000000));
