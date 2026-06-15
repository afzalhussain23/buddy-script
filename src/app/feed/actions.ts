"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { uuidv7 } from "uuidv7";
import type { ZodError } from "zod";
import { db } from "@/db";
import {
  commentLikes,
  comments,
  imageUploads,
  postLikes,
  posts,
} from "@/db/social";
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
  createCommentSchema,
  createPostSchema,
  createReplySchema,
  type FieldErrors,
  feedCursorSchema,
  getFieldErrors,
  getValidationMessage,
  loadLikersSchema,
  loadMoreCommentsSchema,
  loadMoreRepliesSchema,
  toggleCommentLikeSchema,
  togglePostLikeSchema,
} from "@/lib/validation";
import {
  type CommentPage,
  type FeedComment,
  type FeedPage,
  type FeedPost,
  getCommentLikersPage,
  getCommentsPage,
  getFeedPage,
  getPostLikersPage,
  getRepliesPage,
  type LikersPage,
  type ReplyPage,
} from "./queries";

type ActionFailure = {
  ok: false;
  error: string;
  fieldErrors?: FieldErrors;
};

function validationFailure(error: ZodError, fallback: string): ActionFailure {
  return {
    ok: false,
    error: getValidationMessage(error, fallback),
    fieldErrors: getFieldErrors(error),
  };
}

// Funnel unexpected (non-validation, non-business-rule) failures through one
// place: log the full detail server-side and hand the client a generic message.
// Keeps these actions consistent with the { ok: false } contract instead of
// rejecting, which would otherwise surface as an opaque framework error.
function unexpectedFailure(context: string, error: unknown): ActionFailure {
  console.error(context, error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

type CreatePostResult = { ok: true; post: FeedPost } | ActionFailure;

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
    imageUrl: row.imageObjectKey ? `/api/posts/${row.id}/image` : null,
    imageWidth: row.imageWidth,
    imageHeight: row.imageHeight,
    isPrivate: row.isPrivate,
    likeCount: row.likeCount,
    // A just-created post starts unliked, even for its author.
    likedByMe: false,
    commentCount: row.commentCount,
    comments: [],
    nextCommentCursor: null,
    time: formatRelativeTime(row.createdAt),
  };
}

export async function createPost(input: unknown): Promise<CreatePostResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Authentication required." };

  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) {
    return validationFailure(parsed.error, "Invalid post data.");
  }
  const { body, uploadId } = parsed.data;
  const rateLimit = await consumeRateLimit("create-post", session.user.id);
  if (!rateLimit.allowed) {
    return { ok: false, error: "Too many posts. Please try again shortly." };
  }

  if (!uploadId) {
    let row: typeof posts.$inferSelect;
    try {
      [row] = await db
        .insert(posts)
        .values({ authorId: session.user.id, body })
        .returning();
    } catch (error) {
      return unexpectedFailure("Failed to create post", error);
    }
    revalidatePath("/feed");
    return { ok: true, post: toFeedPost(row, session.user) };
  }

  let upload: typeof imageUploads.$inferSelect | undefined;
  try {
    [upload] = await db
      .update(imageUploads)
      .set({ status: "processing" })
      .where(
        and(
          eq(imageUploads.id, uploadId),
          eq(imageUploads.userId, session.user.id),
          eq(imageUploads.status, "pending"),
          gt(imageUploads.expiresAt, new Date()),
        ),
      )
      .returning();
  } catch (error) {
    return unexpectedFailure("Failed to claim image upload", error);
  }

  if (!upload) {
    return { ok: false, error: "This image upload is invalid or expired." };
  }

  let imageDimensions: { width: number; height: number };
  try {
    imageDimensions = await verifyAndPublishImageUpload(upload);
  } catch (error) {
    await db
      .update(imageUploads)
      .set({
        status:
          error instanceof R2UploadVerificationError ? "rejected" : "pending",
      })
      .where(eq(imageUploads.id, upload.id))
      .catch((updateError) => {
        console.error("Failed to reset image upload status", updateError);
      });

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
          imageObjectKey: upload.publishedObjectKey,
          imageWidth: imageDimensions.width,
          imageHeight: imageDimensions.height,
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
  | ActionFailure;

// Set the viewer's like state for a post to `liked`. Idempotent: the desired
// end state is passed in (not a blind toggle), so a double-tap or a retried
// request can't double-count. Each branch is a single atomic statement — the
// insert/delete of the like row and the posts.like_count adjustment happen in
// one transaction, and the counter only moves when a row was actually
// inserted/deleted (count of the CTE), keeping it exact under races.
export async function toggleLike(input: unknown): Promise<ToggleLikeResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Authentication required." };

  const parsed = togglePostLikeSchema.safeParse(input);
  if (!parsed.success) {
    return validationFailure(parsed.error, "Invalid like data.");
  }
  const userId = session.user.id;
  const rateLimit = await consumeRateLimit("toggle-like", userId);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: "You're doing that too fast. Please slow down.",
    };
  }
  const { postId, liked } = parsed.data;

  let result: Awaited<ReturnType<typeof db.execute<{ like_count: number }>>>;
  try {
    result = liked
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
  } catch (error) {
    return unexpectedFailure("Failed to toggle post like", error);
  }

  const row = result.rows[0];
  if (!row) {
    return { ok: false, error: "Post not found." };
  }

  return { ok: true, liked, likeCount: Number(row.like_count) };
}

// Set the viewer's like state for a comment (or reply) to `liked`. Same shape
// and guarantees as toggleLike: idempotent (desired end state, not a blind
// toggle), and the comment_likes row change plus the comments.like_count
// adjustment happen in one atomic statement so the counter stays exact under a
// double-tap or retry. Only live comments on posts the viewer can see qualify.
export async function toggleCommentLike(
  input: unknown,
): Promise<ToggleLikeResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Authentication required." };

  const parsed = toggleCommentLikeSchema.safeParse(input);
  if (!parsed.success) {
    return validationFailure(parsed.error, "Invalid like data.");
  }
  const userId = session.user.id;
  const rateLimit = await consumeRateLimit("toggle-like", userId);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: "You're doing that too fast. Please slow down.",
    };
  }
  const { commentId, liked } = parsed.data;

  let result: Awaited<ReturnType<typeof db.execute<{ like_count: number }>>>;
  try {
    result = liked
      ? await db.execute<{ like_count: number }>(sql`
        with target as (
          select 1 from ${comments}
          inner join ${posts} on ${posts.id} = ${comments.postId}
          where ${comments.id} = ${commentId}
            and ${comments.deletedAt} is null
            and ${posts.deletedAt} is null
            and (${posts.isPrivate} = false or ${posts.authorId} = ${userId})
        ),
        ins as (
          insert into ${commentLikes} (user_id, comment_id)
          select ${userId}, ${commentId} from target
          on conflict (user_id, comment_id) do nothing
          returning 1
        )
        update ${comments}
        set like_count = like_count + (select count(*) from ins)
        where ${comments.id} = ${commentId}
          and exists (select 1 from target)
        returning like_count
      `)
      : await db.execute<{ like_count: number }>(sql`
        with target as (
          select 1 from ${comments}
          inner join ${posts} on ${posts.id} = ${comments.postId}
          where ${comments.id} = ${commentId}
            and ${comments.deletedAt} is null
            and ${posts.deletedAt} is null
            and (${posts.isPrivate} = false or ${posts.authorId} = ${userId})
        ),
        del as (
          delete from ${commentLikes}
          where ${commentLikes.userId} = ${userId}
            and ${commentLikes.commentId} = ${commentId}
            and exists (select 1 from target)
          returning 1
        )
        update ${comments}
        set like_count = greatest(0, like_count - (select count(*) from del))
        where ${comments.id} = ${commentId}
          and exists (select 1 from target)
        returning like_count
      `);
  } catch (error) {
    return unexpectedFailure("Failed to toggle comment like", error);
  }

  const row = result.rows[0];
  if (!row) {
    return { ok: false, error: "Comment not found." };
  }

  return { ok: true, liked, likeCount: Number(row.like_count) };
}

type CreateCommentResult =
  | { ok: true; comment: FeedComment; commentCount: number }
  | ActionFailure;

export async function createComment(
  input: unknown,
): Promise<CreateCommentResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Authentication required." };

  const parsed = createCommentSchema.safeParse(input);
  if (!parsed.success) {
    return validationFailure(parsed.error, "Invalid comment data.");
  }
  const { postId, body } = parsed.data;

  const userId = session.user.id;
  const rateLimit = await consumeRateLimit("create-comment", userId);
  if (!rateLimit.allowed) {
    return { ok: false, error: "Too many comments. Please try again shortly." };
  }

  const commentId = uuidv7();
  let result: Awaited<
    ReturnType<
      typeof db.execute<{
        id: string;
        post_id: string;
        body: string;
        created_at: string | Date;
        comment_count: number;
      }>
    >
  >;
  try {
    result = await db.execute<{
      id: string;
      post_id: string;
      body: string;
      created_at: string | Date;
      comment_count: number;
    }>(sql`
    with target as (
      select ${posts.id} from ${posts}
      where ${posts.id} = ${postId}
        and ${posts.deletedAt} is null
        and (${posts.isPrivate} = false or ${posts.authorId} = ${userId})
    ),
    inserted as (
      insert into ${comments} (id, post_id, author_id, body)
      select ${commentId}, target.id, ${userId}, ${body} from target
      returning id, post_id, body, created_at
    ),
    updated as (
      update ${posts}
      set comment_count = comment_count + (select count(*) from inserted)
      where ${posts.id} = ${postId} and exists (select 1 from inserted)
      returning comment_count
    )
    select inserted.id,
      inserted.post_id,
      inserted.body,
      inserted.created_at,
      updated.comment_count
    from inserted cross join updated
  `);
  } catch (error) {
    return unexpectedFailure("Failed to create comment", error);
  }

  const row = result.rows[0];
  if (!row) {
    return { ok: false, error: "Post not found." };
  }

  revalidatePath("/feed");
  return {
    ok: true,
    comment: {
      id: row.id,
      postId: row.post_id,
      parentId: null,
      authorName: session.user.name,
      authorImage: session.user.image ?? null,
      body: row.body,
      likeCount: 0,
      likedByMe: false,
      time: formatRelativeTime(new Date()),
      replies: [],
      nextReplyCursor: null,
    },
    commentCount: Number(row.comment_count),
  };
}

export async function createReply(
  input: unknown,
): Promise<CreateCommentResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Authentication required." };

  const parsed = createReplySchema.safeParse(input);
  if (!parsed.success) {
    return validationFailure(parsed.error, "Invalid reply data.");
  }

  const { postId, parentId, body } = parsed.data;
  const userId = session.user.id;
  const rateLimit = await consumeRateLimit("create-comment", userId);
  if (!rateLimit.allowed) {
    return { ok: false, error: "Too many comments. Please try again shortly." };
  }

  const replyId = uuidv7();
  let result: Awaited<
    ReturnType<
      typeof db.execute<{
        id: string;
        post_id: string;
        parent_id: string;
        body: string;
        created_at: string | Date;
        comment_count: number;
      }>
    >
  >;
  try {
    result = await db.execute<{
      id: string;
      post_id: string;
      parent_id: string;
      body: string;
      created_at: string | Date;
      comment_count: number;
    }>(sql`
    with target as (
      select ${comments.id}, ${comments.postId}
      from ${comments}
      inner join ${posts} on ${posts.id} = ${comments.postId}
      where ${comments.id} = ${parentId}
        and ${comments.postId} = ${postId}
        and ${comments.parentId} is null
        and ${comments.deletedAt} is null
        and ${posts.deletedAt} is null
        and (${posts.isPrivate} = false or ${posts.authorId} = ${userId})
    ),
    inserted as (
      insert into ${comments} (id, post_id, author_id, parent_id, body)
      select ${replyId}, target.post_id, ${userId}, target.id, ${body}
      from target
      returning id, post_id, parent_id, body, created_at
    ),
    updated as (
      update ${posts}
      set comment_count = comment_count + (select count(*) from inserted)
      where ${posts.id} = ${postId} and exists (select 1 from inserted)
      returning comment_count
    )
    select inserted.id,
      inserted.post_id,
      inserted.parent_id,
      inserted.body,
      inserted.created_at,
      updated.comment_count
    from inserted cross join updated
  `);
  } catch (error) {
    return unexpectedFailure("Failed to create reply", error);
  }

  const row = result.rows[0];
  if (!row) {
    return { ok: false, error: "Parent comment not found." };
  }

  revalidatePath("/feed");
  return {
    ok: true,
    comment: {
      id: row.id,
      postId: row.post_id,
      parentId: row.parent_id,
      authorName: session.user.name,
      authorImage: session.user.image ?? null,
      body: row.body,
      likeCount: 0,
      likedByMe: false,
      time: formatRelativeTime(new Date(row.created_at)),
      replies: [],
      nextReplyCursor: null,
    },
    commentCount: Number(row.comment_count),
  };
}

type LoadMorePostsResult = { ok: true; page: FeedPage } | ActionFailure;

export async function loadMorePosts(
  input: unknown,
): Promise<LoadMorePostsResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Authentication required." };

  const parsed = feedCursorSchema.safeParse(input);
  if (!parsed.success) {
    return validationFailure(parsed.error, "Invalid feed cursor.");
  }

  const rateLimit = await consumeRateLimit("feed-read", session.user.id);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: "You're doing that too fast. Please slow down.",
    };
  }

  try {
    return { ok: true, page: await getFeedPage(session.user.id, parsed.data) };
  } catch (error) {
    return unexpectedFailure("Failed to load more posts", error);
  }
}

type LoadMoreCommentsResult = { ok: true; page: CommentPage } | ActionFailure;

export async function loadMoreComments(
  input: unknown,
): Promise<LoadMoreCommentsResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Authentication required." };

  const parsed = loadMoreCommentsSchema.safeParse(input);
  if (!parsed.success) {
    return validationFailure(parsed.error, "Invalid comment cursor.");
  }

  const rateLimit = await consumeRateLimit("feed-read", session.user.id);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: "You're doing that too fast. Please slow down.",
    };
  }

  try {
    return {
      ok: true,
      page: await getCommentsPage(
        session.user.id,
        parsed.data.postId,
        parsed.data.cursor,
      ),
    };
  } catch (error) {
    return unexpectedFailure("Failed to load more comments", error);
  }
}

type LoadMoreRepliesResult = { ok: true; page: ReplyPage } | ActionFailure;

export async function loadMoreReplies(
  input: unknown,
): Promise<LoadMoreRepliesResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Authentication required." };

  const parsed = loadMoreRepliesSchema.safeParse(input);
  if (!parsed.success) {
    return validationFailure(parsed.error, "Invalid reply cursor.");
  }

  const rateLimit = await consumeRateLimit("feed-read", session.user.id);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: "You're doing that too fast. Please slow down.",
    };
  }

  try {
    return {
      ok: true,
      page: await getRepliesPage(
        session.user.id,
        parsed.data.postId,
        parsed.data.parentId,
        parsed.data.cursor,
      ),
    };
  } catch (error) {
    return unexpectedFailure("Failed to load more replies", error);
  }
}

type LoadLikersResult = { ok: true; page: LikersPage } | ActionFailure;

// Lazily fetch the likers of a post, comment, or reply for the "who liked this"
// modal. Visibility is enforced in the query (the same rule the feed uses), so
// this only checks the viewer is signed in and the input is well-formed.
export async function loadLikers(input: unknown): Promise<LoadLikersResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Authentication required." };

  const parsed = loadLikersSchema.safeParse(input);
  if (!parsed.success) {
    return validationFailure(parsed.error, "Invalid likes request.");
  }

  const rateLimit = await consumeRateLimit("feed-read", session.user.id);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: "You're doing that too fast. Please slow down.",
    };
  }

  const { targetType, targetId, cursor } = parsed.data;

  try {
    const page =
      targetType === "post"
        ? await getPostLikersPage(
            session.user.id,
            targetId,
            cursor ?? undefined,
          )
        : await getCommentLikersPage(
            session.user.id,
            targetId,
            cursor ?? undefined,
          );

    return { ok: true, page };
  } catch (error) {
    return unexpectedFailure("Failed to load likers", error);
  }
}
