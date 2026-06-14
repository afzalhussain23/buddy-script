CREATE TABLE "image_uploads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pending_object_key" text NOT NULL,
	"published_object_key" text NOT NULL,
	"public_url" text NOT NULL,
	"content_type" text NOT NULL,
	"expected_size" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attached_post_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified_at" timestamp,
	CONSTRAINT "image_uploads_pending_object_key_unique" UNIQUE("pending_object_key"),
	CONSTRAINT "image_uploads_published_object_key_unique" UNIQUE("published_object_key"),
	CONSTRAINT "image_uploads_public_url_unique" UNIQUE("public_url"),
	CONSTRAINT "image_uploads_attached_post_id_unique" UNIQUE("attached_post_id"),
	CONSTRAINT "image_uploads_status_check" CHECK ("image_uploads"."status" in ('pending', 'processing', 'attached', 'rejected')),
	CONSTRAINT "image_uploads_expected_size_check" CHECK ("image_uploads"."expected_size" > 0 and "image_uploads"."expected_size" <= 5242880)
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "image_uploads" ADD CONSTRAINT "image_uploads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "image_uploads_user_created_idx" ON "image_uploads" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "image_uploads_expires_idx" ON "image_uploads" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "rate_limit_buckets_expires_idx" ON "rate_limit_buckets" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_image_url_unique_idx" ON "posts" USING btree ("image_url") WHERE "posts"."image_url" is not null;