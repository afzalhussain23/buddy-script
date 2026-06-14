"use server";

import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { uuidv7 } from "uuidv7";
import { db } from "@/db";
import { imageUploads, posts } from "@/db/social";
import { auth } from "@/lib/auth";
import {
  deleteR2Object,
  R2ConfigurationError,
  R2UploadVerificationError,
  verifyAndPublishImageUpload,
} from "@/lib/r2";
import { consumeRateLimit } from "@/lib/rate-limit";
import { type FeedCursor, type FeedPage, getFeedPage } from "./queries";

type CreatePostResult = { ok: true } | { ok: false; error: string };
const POST_LIMIT = 20;
const POST_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export async function createPost(input: {
  body: string;
  uploadId: string | null;
}): Promise<CreatePostResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Authentication required." };

  if (
    !input ||
    typeof input.body !== "string" ||
    (input.uploadId !== null && typeof input.uploadId !== "string")
  ) {
    return { ok: false, error: "Invalid post data." };
  }

  const body = input.body.trim();
  if (!body && !input.uploadId) {
    return { ok: false, error: "Write something or choose an image." };
  }
  if (body.length > 5000) {
    return { ok: false, error: "Post must be at most 5,000 characters." };
  }
  const rateLimit = await consumeRateLimit({
    action: "create-post",
    identifier: session.user.id,
    limit: POST_LIMIT,
    windowMs: POST_LIMIT_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return { ok: false, error: "Too many posts. Please try again shortly." };
  }

  if (!input.uploadId) {
    await db.insert(posts).values({ authorId: session.user.id, body });
    revalidatePath("/feed");
    return { ok: true };
  }

  const [upload] = await db
    .update(imageUploads)
    .set({ status: "processing" })
    .where(
      and(
        eq(imageUploads.id, input.uploadId),
        eq(imageUploads.userId, session.user.id),
        eq(imageUploads.status, "pending"),
        gt(imageUploads.expiresAt, new Date()),
      ),
    )
    .returning();

  if (!upload) {
    return { ok: false, error: "This image upload is invalid or expired." };
  }

  try {
    await verifyAndPublishImageUpload(upload);
  } catch (error) {
    await db
      .update(imageUploads)
      .set({
        status:
          error instanceof R2UploadVerificationError ? "rejected" : "pending",
      })
      .where(eq(imageUploads.id, upload.id));

    if (error instanceof R2ConfigurationError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof R2UploadVerificationError) {
      return { ok: false, error: error.message };
    }
    console.error("Failed to publish R2 image", error);
    return { ok: false, error: "Could not verify the uploaded image." };
  }

  const postId = uuidv7();
  try {
    await db.batch([
      db.insert(posts).values({
        id: postId,
        authorId: session.user.id,
        body,
        imageUrl: upload.publicUrl,
      }),
      db
        .update(imageUploads)
        .set({
          status: "attached",
          attachedPostId: postId,
          verifiedAt: new Date(),
        })
        .where(
          and(
            eq(imageUploads.id, upload.id),
            eq(imageUploads.status, "processing"),
          ),
        ),
    ]);
  } catch (error) {
    await Promise.allSettled([
      deleteR2Object(upload.publishedObjectKey),
      db
        .update(imageUploads)
        .set({ status: "pending" })
        .where(eq(imageUploads.id, upload.id)),
    ]);
    console.error("Failed to attach verified image upload", error);
    return { ok: false, error: "Could not create post." };
  }

  await deleteR2Object(upload.pendingObjectKey).catch((error) => {
    console.error("Failed to delete attached pending R2 object", error);
  });
  revalidatePath("/feed");
  return { ok: true };
}

export async function loadMorePosts(cursor: FeedCursor): Promise<FeedPage> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { posts: [], nextCursor: null };
  }
  return getFeedPage(session.user.id, cursor);
}
