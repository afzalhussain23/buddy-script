import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  lte,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth";
import { commentLikes, comments, postLikes, posts } from "@/db/social";
import { formatRelativeTime } from "@/lib/relative-time";

export const FEED_PAGE_SIZE = 20;
export const COMMENT_PAGE_SIZE = 10;
export const REPLY_PAGE_SIZE = 5;
export const LIKERS_PAGE_SIZE = 50;

// Keyset (not OFFSET) cursor: the created_at + id of the last row returned. The
// feed orders by created_at DESC, so id alone isn't a sufficient keyset — id is
// only the tiebreaker for rows sharing a timestamp. created_at is serialized as an
// ISO string to survive the server-action boundary; the column is millisecond
// precision so the value round-trips exactly (see posts.createdAt).
export type FeedCursor = { createdAt: string; id: string };
export type CommentCursor = { createdAt: string; id: string };
// Likers are keyed on the like row's (created_at, user_id): created_at is the
// "newest first" sort, user_id the tiebreaker for likes sharing a timestamp.
// created_at is serialized via to_char at microsecond precision and re-parsed
// with ::timestamp (not a JS Date, which truncates to ms) so the keyset is exact.
export type LikerCursor = { createdAt: string; userId: string };

export type Liker = {
  userId: string;
  name: string;
  image: string | null;
};

export type LikersPage = {
  likers: Liker[];
  nextCursor: LikerCursor | null;
};

export type FeedComment = {
  id: string;
  postId: string;
  parentId: string | null;
  authorName: string;
  authorImage: string | null;
  body: string;
  likeCount: number;
  likedByMe: boolean;
  time: string;
  replies: FeedComment[];
  nextReplyCursor: CommentCursor | null;
};

export type FeedPost = {
  id: string;
  authorName: string;
  authorImage: string | null;
  body: string;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  isPrivate: boolean;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  comments: FeedComment[];
  nextCommentCursor: CommentCursor | null;
  time: string;
};

export type FeedPage = {
  posts: FeedPost[];
  nextCursor: FeedCursor | null;
};

export type CommentPage = {
  comments: FeedComment[];
  nextCursor: CommentCursor | null;
};

export type ReplyPage = {
  replies: FeedComment[];
  nextCursor: CommentCursor | null;
};

function toFeedComment(row: {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  likeCount: number;
  likedByMe: boolean;
  createdAt: Date;
  authorName: string | null;
  authorImage: string | null;
}): FeedComment {
  return {
    id: row.id,
    postId: row.postId,
    parentId: row.parentId,
    authorName: row.authorName ?? "[deleted user]",
    authorImage: row.authorImage,
    body: row.body,
    likeCount: row.likeCount,
    likedByMe: row.likedByMe,
    time: formatRelativeTime(row.createdAt),
    replies: [],
    nextReplyCursor: null,
  };
}

async function getRepliesByParentIds(viewerId: string, parentIds: string[]) {
  const rankedReplies = db
    .select({
      id: comments.id,
      postId: comments.postId,
      parentId: comments.parentId,
      authorId: comments.authorId,
      body: comments.body,
      likeCount: comments.likeCount,
      createdAt: comments.createdAt,
      createdAtCursor:
        sql<string>`to_char(${comments.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS.US')`.as(
          "created_at_cursor",
        ),
      rank: sql<number>`row_number() over (
        partition by ${comments.parentId}
        order by ${comments.createdAt} asc, ${comments.id} asc
      )`.as("reply_rank"),
    })
    .from(comments)
    .where(
      and(inArray(comments.parentId, parentIds), isNull(comments.deletedAt)),
    )
    .as("ranked_replies");
  const rows = parentIds.length
    ? await db
        .select({
          id: rankedReplies.id,
          postId: rankedReplies.postId,
          parentId: rankedReplies.parentId,
          body: rankedReplies.body,
          likeCount: rankedReplies.likeCount,
          likedByMe: sql<boolean>`${commentLikes.userId} is not null`,
          createdAt: rankedReplies.createdAt,
          createdAtCursor: rankedReplies.createdAtCursor,
          authorName: user.name,
          authorImage: user.image,
        })
        .from(rankedReplies)
        .leftJoin(user, eq(rankedReplies.authorId, user.id))
        .leftJoin(
          commentLikes,
          and(
            eq(commentLikes.commentId, rankedReplies.id),
            eq(commentLikes.userId, viewerId),
          ),
        )
        .where(lte(rankedReplies.rank, REPLY_PAGE_SIZE + 1))
        .orderBy(
          asc(rankedReplies.parentId),
          asc(rankedReplies.createdAt),
          asc(rankedReplies.id),
        )
    : [];

  const rowsByParent = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const parentRows = rowsByParent.get(row.parentId) ?? [];
    parentRows.push(row);
    rowsByParent.set(row.parentId, parentRows);
  }

  const repliesByParent = new Map<string, ReplyPage>();
  for (const parentId of parentIds) {
    const parentRows = rowsByParent.get(parentId) ?? [];
    const hasMore = parentRows.length > REPLY_PAGE_SIZE;
    const page = hasMore ? parentRows.slice(0, REPLY_PAGE_SIZE) : parentRows;
    const last = page.at(-1);
    repliesByParent.set(parentId, {
      replies: page.map(toFeedComment),
      nextCursor:
        hasMore && last
          ? { createdAt: last.createdAtCursor, id: last.id }
          : null,
    });
  }
  return repliesByParent;
}

// Visible posts for `viewerId`: anything public, plus the viewer's own private
// posts. Ordered created_at DESC, id DESC to match the partial feed index, with
// keyset pagination driven by `cursor`.
export async function getFeedPage(
  viewerId: string,
  cursor?: FeedCursor,
): Promise<FeedPage> {
  const conditions: (SQL | undefined)[] = [
    isNull(posts.deletedAt),
    or(eq(posts.isPrivate, false), eq(posts.authorId, viewerId)),
  ];

  if (cursor) {
    // (created_at, id) < (cursor.createdAt, cursor.id) for DESC ordering.
    const cursorDate = new Date(cursor.createdAt);
    conditions.push(
      or(
        lt(posts.createdAt, cursorDate),
        and(eq(posts.createdAt, cursorDate), lt(posts.id, cursor.id)),
      ),
    );
  }

  // Fetch one extra row to learn whether another page exists, without a COUNT.
  const rows = await db
    .select({
      id: posts.id,
      body: posts.body,
      imageObjectKey: posts.imageObjectKey,
      imageWidth: posts.imageWidth,
      imageHeight: posts.imageHeight,
      isPrivate: posts.isPrivate,
      likeCount: posts.likeCount,
      // Correlate the viewer's own like row only (the join is keyed on
      // post_id AND user_id = viewer), so the boolean is per-user.
      likedByMe: sql<boolean>`${postLikes.userId} is not null`,
      commentCount: posts.commentCount,
      createdAt: posts.createdAt,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(posts)
    .leftJoin(user, eq(posts.authorId, user.id))
    .leftJoin(
      postLikes,
      and(eq(postLikes.postId, posts.id), eq(postLikes.userId, viewerId)),
    )
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(FEED_PAGE_SIZE + 1);

  const hasMore = rows.length > FEED_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, FEED_PAGE_SIZE) : rows;
  const last = page.at(-1);
  const postIds = page.map((post) => post.id);
  const rankedComments = db
    .select({
      id: comments.id,
      postId: comments.postId,
      parentId: comments.parentId,
      authorId: comments.authorId,
      body: comments.body,
      likeCount: comments.likeCount,
      createdAt: comments.createdAt,
      createdAtCursor:
        sql<string>`to_char(${comments.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS.US')`.as(
          "created_at_cursor",
        ),
      rank: sql<number>`row_number() over (
        partition by ${comments.postId}
        order by ${comments.createdAt} asc, ${comments.id} asc
      )`.as("comment_rank"),
    })
    .from(comments)
    .where(
      and(
        inArray(comments.postId, postIds),
        isNull(comments.parentId),
        isNull(comments.deletedAt),
      ),
    )
    .as("ranked_comments");
  const commentRows = postIds.length
    ? await db
        .select({
          id: rankedComments.id,
          postId: rankedComments.postId,
          parentId: rankedComments.parentId,
          body: rankedComments.body,
          likeCount: rankedComments.likeCount,
          likedByMe: sql<boolean>`${commentLikes.userId} is not null`,
          createdAt: rankedComments.createdAt,
          createdAtCursor: rankedComments.createdAtCursor,
          authorName: user.name,
          authorImage: user.image,
        })
        .from(rankedComments)
        .leftJoin(user, eq(rankedComments.authorId, user.id))
        .leftJoin(
          commentLikes,
          and(
            eq(commentLikes.commentId, rankedComments.id),
            eq(commentLikes.userId, viewerId),
          ),
        )
        .where(lte(rankedComments.rank, COMMENT_PAGE_SIZE + 1))
        .orderBy(
          asc(rankedComments.postId),
          asc(rankedComments.createdAt),
          asc(rankedComments.id),
        )
    : [];

  const commentRowsByPost = new Map<string, typeof commentRows>();
  for (const comment of commentRows) {
    const list = commentRowsByPost.get(comment.postId) ?? [];
    list.push(comment);
    commentRowsByPost.set(comment.postId, list);
  }
  const visibleCommentRows = [...commentRowsByPost.values()].flatMap((rows) =>
    rows.slice(0, COMMENT_PAGE_SIZE),
  );
  const repliesByParent = await getRepliesByParentIds(
    viewerId,
    visibleCommentRows.map((comment) => comment.id),
  );

  return {
    posts: page.map((r) => ({
      id: r.id,
      // authorId is SET NULL on user delete, so the join can miss.
      authorName: r.authorName ?? "[deleted user]",
      authorImage: r.authorImage,
      body: r.body,
      imageUrl: r.imageObjectKey ? `/api/posts/${r.id}/image` : null,
      imageWidth: r.imageWidth,
      imageHeight: r.imageHeight,
      isPrivate: r.isPrivate,
      likeCount: r.likeCount,
      likedByMe: r.likedByMe,
      commentCount: r.commentCount,
      comments: (commentRowsByPost.get(r.id) ?? [])
        .slice(0, COMMENT_PAGE_SIZE)
        .map((comment) => ({
          ...toFeedComment(comment),
          replies: repliesByParent.get(comment.id)?.replies ?? [],
          nextReplyCursor: repliesByParent.get(comment.id)?.nextCursor ?? null,
        })),
      nextCommentCursor: (() => {
        const postComments = commentRowsByPost.get(r.id) ?? [];
        const cursorComment = postComments[COMMENT_PAGE_SIZE - 1];
        return postComments.length > COMMENT_PAGE_SIZE && cursorComment
          ? {
              createdAt: cursorComment.createdAtCursor,
              id: cursorComment.id,
            }
          : null;
      })(),
      time: formatRelativeTime(r.createdAt),
    })),
    nextCursor:
      hasMore && last
        ? { createdAt: last.createdAt.toISOString(), id: last.id }
        : null,
  };
}

export async function getCommentsPage(
  viewerId: string,
  postId: string,
  cursor?: CommentCursor,
): Promise<CommentPage> {
  const conditions: (SQL | undefined)[] = [
    eq(comments.postId, postId),
    isNull(comments.parentId),
    isNull(comments.deletedAt),
    sql`exists (
      select 1 from ${posts}
      where ${posts.id} = ${postId}
        and ${posts.deletedAt} is null
        and (${posts.isPrivate} = false or ${posts.authorId} = ${viewerId})
    )`,
  ];

  if (cursor) {
    conditions.push(
      or(
        sql`${comments.createdAt} > ${cursor.createdAt}::timestamp`,
        and(
          sql`${comments.createdAt} = ${cursor.createdAt}::timestamp`,
          sql`${comments.id} > ${cursor.id}::uuid`,
        ),
      ),
    );
  }

  const rows = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      parentId: comments.parentId,
      body: comments.body,
      likeCount: comments.likeCount,
      likedByMe: sql<boolean>`${commentLikes.userId} is not null`,
      createdAt: comments.createdAt,
      createdAtCursor: sql<string>`to_char(${comments.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS.US')`,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(comments)
    .leftJoin(user, eq(comments.authorId, user.id))
    .leftJoin(
      commentLikes,
      and(
        eq(commentLikes.commentId, comments.id),
        eq(commentLikes.userId, viewerId),
      ),
    )
    .where(and(...conditions))
    .orderBy(asc(comments.createdAt), asc(comments.id))
    .limit(COMMENT_PAGE_SIZE + 1);

  const hasMore = rows.length > COMMENT_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, COMMENT_PAGE_SIZE) : rows;
  const last = page.at(-1);
  const repliesByParent = await getRepliesByParentIds(
    viewerId,
    page.map((comment) => comment.id),
  );

  return {
    comments: page.map((comment) => ({
      ...toFeedComment(comment),
      replies: repliesByParent.get(comment.id)?.replies ?? [],
      nextReplyCursor: repliesByParent.get(comment.id)?.nextCursor ?? null,
    })),
    nextCursor:
      hasMore && last ? { createdAt: last.createdAtCursor, id: last.id } : null,
  };
}

export async function getRepliesPage(
  viewerId: string,
  postId: string,
  parentId: string,
  cursor?: CommentCursor,
): Promise<ReplyPage> {
  const conditions: SQL[] = [
    eq(comments.postId, postId),
    eq(comments.parentId, parentId),
    isNull(comments.deletedAt),
    sql`exists (
      select 1 from ${comments} parent
      inner join ${posts} on ${posts.id} = parent.post_id
      where parent.id = ${parentId}
        and parent.post_id = ${postId}
        and parent.parent_id is null
        and parent.deleted_at is null
        and ${posts.deletedAt} is null
        and (${posts.isPrivate} = false or ${posts.authorId} = ${viewerId})
    )`,
  ];

  if (cursor) {
    conditions.push(
      sql`(${comments.createdAt}, ${comments.id}) > (${cursor.createdAt}::timestamp, ${cursor.id}::uuid)`,
    );
  }

  const rows = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      parentId: comments.parentId,
      body: comments.body,
      likeCount: comments.likeCount,
      likedByMe: sql<boolean>`${commentLikes.userId} is not null`,
      createdAt: comments.createdAt,
      createdAtCursor: sql<string>`to_char(${comments.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS.US')`,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(comments)
    .leftJoin(user, eq(comments.authorId, user.id))
    .leftJoin(
      commentLikes,
      and(
        eq(commentLikes.commentId, comments.id),
        eq(commentLikes.userId, viewerId),
      ),
    )
    .where(and(...conditions))
    .orderBy(asc(comments.createdAt), asc(comments.id))
    .limit(REPLY_PAGE_SIZE + 1);

  const hasMore = rows.length > REPLY_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, REPLY_PAGE_SIZE) : rows;
  const last = page.at(-1);

  return {
    replies: page.map(toFeedComment),
    nextCursor:
      hasMore && last ? { createdAt: last.createdAtCursor, id: last.id } : null,
  };
}

// Who liked a post, newest first, keyset-paginated. The inner join to `user`
// (likes cascade-delete with the user, so the row always resolves) yields the
// liker's full name. The EXISTS guard repeats the feed's visibility rule so a
// viewer can't enumerate likers of a hidden post by id.
export async function getPostLikersPage(
  viewerId: string,
  postId: string,
  cursor?: LikerCursor,
): Promise<LikersPage> {
  const conditions: SQL[] = [
    eq(postLikes.postId, postId),
    sql`exists (
      select 1 from ${posts}
      where ${posts.id} = ${postId}
        and ${posts.deletedAt} is null
        and (${posts.isPrivate} = false or ${posts.authorId} = ${viewerId})
    )`,
  ];

  if (cursor) {
    conditions.push(
      or(
        sql`${postLikes.createdAt} < ${cursor.createdAt}::timestamp`,
        and(
          sql`${postLikes.createdAt} = ${cursor.createdAt}::timestamp`,
          sql`${postLikes.userId} < ${cursor.userId}`,
        ),
      ) as SQL,
    );
  }

  const rows = await db
    .select({
      userId: postLikes.userId,
      name: user.name,
      image: user.image,
      createdAtCursor: sql<string>`to_char(${postLikes.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS.US')`,
    })
    .from(postLikes)
    .innerJoin(user, eq(postLikes.userId, user.id))
    .where(and(...conditions))
    .orderBy(desc(postLikes.createdAt), desc(postLikes.userId))
    .limit(LIKERS_PAGE_SIZE + 1);

  return toLikersPage(rows);
}

// Who liked a comment or reply (both live in `comments`), newest first. Mirrors
// getPostLikersPage; the EXISTS guard requires the comment to be live and its
// post visible to the viewer.
export async function getCommentLikersPage(
  viewerId: string,
  commentId: string,
  cursor?: LikerCursor,
): Promise<LikersPage> {
  const conditions: SQL[] = [
    eq(commentLikes.commentId, commentId),
    sql`exists (
      select 1 from ${comments}
      inner join ${posts} on ${posts.id} = ${comments.postId}
      where ${comments.id} = ${commentId}
        and ${comments.deletedAt} is null
        and ${posts.deletedAt} is null
        and (${posts.isPrivate} = false or ${posts.authorId} = ${viewerId})
    )`,
  ];

  if (cursor) {
    conditions.push(
      or(
        sql`${commentLikes.createdAt} < ${cursor.createdAt}::timestamp`,
        and(
          sql`${commentLikes.createdAt} = ${cursor.createdAt}::timestamp`,
          sql`${commentLikes.userId} < ${cursor.userId}`,
        ),
      ) as SQL,
    );
  }

  const rows = await db
    .select({
      userId: commentLikes.userId,
      name: user.name,
      image: user.image,
      createdAtCursor: sql<string>`to_char(${commentLikes.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS.US')`,
    })
    .from(commentLikes)
    .innerJoin(user, eq(commentLikes.userId, user.id))
    .where(and(...conditions))
    .orderBy(desc(commentLikes.createdAt), desc(commentLikes.userId))
    .limit(LIKERS_PAGE_SIZE + 1);

  return toLikersPage(rows);
}

// Shared tail for the two liker queries: peel the +1 lookahead row into a
// nextCursor and shape the rest into `Liker`s.
function toLikersPage(
  rows: {
    userId: string;
    name: string;
    image: string | null;
    createdAtCursor: string;
  }[],
): LikersPage {
  const hasMore = rows.length > LIKERS_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, LIKERS_PAGE_SIZE) : rows;
  const last = page.at(-1);
  return {
    likers: page.map((row) => ({
      userId: row.userId,
      name: row.name,
      image: row.image,
    })),
    nextCursor:
      hasMore && last
        ? { createdAt: last.createdAtCursor, userId: last.userId }
        : null,
  };
}
