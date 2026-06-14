import { and, desc, eq, isNull, lt, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth";
import { posts } from "@/db/social";
import { formatRelativeTime } from "@/lib/relative-time";

export const FEED_PAGE_SIZE = 20;

// Keyset (not OFFSET) cursor: the id of the last row returned. id is a uuidv7,
// so its lexical order tracks creation order — it's a sufficient, single-column
// keyset, and unlike a created_at timestamp it survives the server-action
// boundary without lossy precision rounding. A plain value for serialization.
export type FeedCursor = { id: string };

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
// posts. Ordered id DESC to match the partial feed index, with keyset
// pagination driven by `cursor`.
export async function getFeedPage(
  viewerId: string,
  cursor?: FeedCursor,
): Promise<FeedPage> {
  const conditions: (SQL | undefined)[] = [
    isNull(posts.deletedAt),
    or(eq(posts.isPrivate, false), eq(posts.authorId, viewerId)),
  ];

  if (cursor) {
    // id < cursor.id for DESC ordering.
    conditions.push(lt(posts.id, cursor.id));
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
    .orderBy(desc(posts.id))
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
    nextCursor: hasMore && last ? { id: last.id } : null,
  };
}
