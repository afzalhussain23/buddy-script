"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { uuidv7 } from "uuidv7";
import { db } from "@/db";
import { imageUploads, postLikes, posts } from "@/db/social";
import { auth } from "@/lib/auth";
import {
  deleteR2Object,
  R2ConfigurationError,
  R2UploadVerificationError,
  verifyAndPublishImageUpload,
} from "@/lib/r2";
import { consumeRateLimit } from "@/lib/rate-limit";
import { formatRelativeTime } from "@/lib/relative-time";
import {
  type FeedCursor,
  type FeedPage,
  type FeedPost,
  getFeedPage,
} from "./queries";

type CreatePostResult =
  | { ok: true; post: FeedPost }
  | { ok: false; error: string };
const POST_LIMIT = 20;
const POST_LIMIT_WINDOW_MS = 10 * 60 * 1000;

// Shape a freshly-inserted row into a FeedPost so the client can render it
// without a round-trip. The author is always the current session user.
function toFeedPost(
  row: typeof posts.$inferSelect,
  author: { name: string; image?: string | null },
): FeedPost {
  return {
    id: row.id,
    authorName: author.name,
    authorImage: author.image ?? null,
    body: row.body,
    imageUrl: row.imageUrl,
    isPrivate: row.isPrivate,
    likeCount: row.likeCount,
    // A just-created post starts unliked, even for its author.
    likedByMe: false,
    commentCount: row.commentCount,
    time: formatRelativeTime(row.createdAt),
  };
}

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
    const [row] = await db
      .insert(posts)
      .values({ authorId: session.user.id, body })
      .returning();
    revalidatePath("/feed");
    return { ok: true, post: toFeedPost(row, session.user) };
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
  let createdRow: typeof posts.$inferSelect;
  try {
    const [[insertedRow]] = await db.batch([
      db
        .insert(posts)
        .values({
          id: postId,
          authorId: session.user.id,
          body,
          imageUrl: upload.publicUrl,
        })
        .returning(),
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
    createdRow = insertedRow;
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
  return { ok: true, post: toFeedPost(createdRow, session.user) };
}

type ToggleLikeResult =
  | { ok: true; liked: boolean; likeCount: number }
  | { ok: false; error: string };

// Set the viewer's like state for a post to `liked`. Idempotent: the desired
// end state is passed in (not a blind toggle), so a double-tap or a retried
// request can't double-count. Each branch is a single atomic statement — the
// insert/delete of the like row and the posts.like_count adjustment happen in
// one transaction, and the counter only moves when a row was actually
// inserted/deleted (count of the CTE), keeping it exact under races.
export async function toggleLike(input: {
  postId: string;
  liked: boolean;
}): Promise<ToggleLikeResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Authentication required." };

  if (
    !input ||
    typeof input.postId !== "string" ||
    typeof input.liked !== "boolean"
  ) {
    return { ok: false, error: "Invalid like data." };
  }

  const userId = session.user.id;
  const { postId, liked } = input;

  const result = liked
    ? await db.execute<{ like_count: number }>(sql`
        with target as (
          select 1 from ${posts}
          where ${posts.id} = ${postId}
            and ${posts.deletedAt} is null
            and (${posts.isPrivate} = false or ${posts.authorId} = ${userId})
        ),
        ins as (
          insert into ${postLikes} (user_id, post_id)
          select ${userId}, ${postId} from target
          on conflict (user_id, post_id) do nothing
          returning 1
        )
        update ${posts}
        set like_count = like_count + (select count(*) from ins)
        where ${posts.id} = ${postId}
          and ${posts.deletedAt} is null
          and (${posts.isPrivate} = false or ${posts.authorId} = ${userId})
        returning like_count
      `)
    : await db.execute<{ like_count: number }>(sql`
        with del as (
          delete from ${postLikes}
          where ${postLikes.userId} = ${userId}
            and ${postLikes.postId} = ${postId}
            and exists (
              select 1 from ${posts}
              where ${posts.id} = ${postId}
                and ${posts.deletedAt} is null
                and (${posts.isPrivate} = false or ${posts.authorId} = ${userId})
            )
          returning 1
        )
        update ${posts}
        set like_count = greatest(0, like_count - (select count(*) from del))
        where ${posts.id} = ${postId}
          and ${posts.deletedAt} is null
          and (${posts.isPrivate} = false or ${posts.authorId} = ${userId})
        returning like_count
      `);

  const row = result.rows[0];
  if (!row) {
    return { ok: false, error: "Post not found." };
  }

  return { ok: true, liked, likeCount: Number(row.like_count) };
}

export async function loadMorePosts(cursor: FeedCursor): Promise<FeedPage> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { posts: [], nextCursor: null };
  }
  return getFeedPage(session.user.id, cursor);
}
