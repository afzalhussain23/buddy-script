import { and, desc, eq, isNull, lt, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth";
import { posts } from "@/db/social";
import { formatRelativeTime } from "@/lib/relative-time";

export const FEED_PAGE_SIZE = 20;

// Keyset (not OFFSET) cursor: the created_at + id of the last row returned. The
// feed orders by created_at DESC, so id alone isn't a sufficient keyset — id is
// only the tiebreaker for rows sharing a timestamp. created_at is serialized as an
// ISO string to survive the server-action boundary; the column is millisecond
// precision so the value round-trips exactly (see posts.createdAt).
export type FeedCursor = { createdAt: string; id: string };

export type FeedPost = {
  id: string;
  authorName: string;
  authorImage: string | null;
  body: string;
  imageUrl: string | null;
  isPrivate: boolean;
  likeCount: number;
  commentCount: number;
  time: string;
};

export type FeedPage = {
  posts: FeedPost[];
  nextCursor: FeedCursor | null;
};

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
      imageUrl: posts.imageUrl,
      isPrivate: posts.isPrivate,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      createdAt: posts.createdAt,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(posts)
    .leftJoin(user, eq(posts.authorId, user.id))
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(FEED_PAGE_SIZE + 1);

  const hasMore = rows.length > FEED_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, FEED_PAGE_SIZE) : rows;
  const last = page.at(-1);

  return {
    posts: page.map((r) => ({
      id: r.id,
      // authorId is SET NULL on user delete, so the join can miss.
      authorName: r.authorName ?? "[deleted user]",
      authorImage: r.authorImage,
      body: r.body,
      imageUrl: r.imageUrl,
      isPrivate: r.isPrivate,
      likeCount: r.likeCount,
      commentCount: r.commentCount,
      time: formatRelativeTime(r.createdAt),
    })),
    nextCursor:
      hasMore && last
        ? { createdAt: last.createdAt.toISOString(), id: last.id }
        : null,
  };
}
