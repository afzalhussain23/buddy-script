import { desc, relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { user } from "./auth";

export const posts = pgTable(
  "posts",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    authorId: text("author_id").references(() => user.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    imageUrl: text("image_url"),
    isPrivate: boolean("is_private").default(false).notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    commentCount: integer("comment_count").default(0).notNull(),
    // Millisecond precision (not the default microsecond) so a JS Date round-trips
    // exactly — the feed's keyset cursor compares created_at values, and a ms/µs
    // mismatch would skip rows at page boundaries.
    createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    // Keyset pagination of the feed (ORDER BY created_at DESC, id DESC), live posts
    // only. Ordering by created_at (not id) keeps "most recent first" correct even
    // for rows whose id isn't a time-ordered uuidv7 (e.g. seeded v4 UUIDs); id is the
    // tiebreaker for rows sharing a timestamp. Partial on `deleted_at IS NULL` keeps
    // soft-deleted rows out of the hot feed index.
    index("posts_feed_created_idx")
      .on(desc(table.createdAt), desc(table.id))
      .where(sql`${table.deletedAt} is null`),
    // Speeds the ON DELETE SET NULL lookup and author-filtered reads (own/private posts).
    // Partial: both only query `author_id = <id>` (strict, so excludes NULL), so anonymized
    // deleted-user rows are kept out of the index.
    index("posts_author_id_idx")
      .on(table.authorId)
      .where(sql`${table.authorId} is not null`),
    // A published object belongs to one post. NULL remains valid for text-only posts.
    uniqueIndex("posts_image_url_unique_idx")
      .on(table.imageUrl)
      .where(sql`${table.imageUrl} is not null`),
  ],
);

export const imageUploads = pgTable(
  "image_uploads",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    pendingObjectKey: text("pending_object_key").notNull().unique(),
    publishedObjectKey: text("published_object_key").notNull().unique(),
    publicUrl: text("public_url").notNull().unique(),
    contentType: text("content_type").notNull(),
    expectedSize: integer("expected_size").notNull(),
    status: text("status").default("pending").notNull(),
    attachedPostId: uuid("attached_post_id").unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    verifiedAt: timestamp("verified_at"),
  },
  (table) => [
    index("image_uploads_user_created_idx").on(table.userId, table.createdAt),
    index("image_uploads_expires_idx").on(table.expiresAt),
    check(
      "image_uploads_status_check",
      sql`${table.status} in ('pending', 'processing', 'attached', 'rejected')`,
    ),
    check(
      "image_uploads_expected_size_check",
      sql`${table.expectedSize} > 0 and ${table.expectedSize} <= 5242880`,
    ),
  ],
);

export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    key: text("key").primaryKey(),
    count: integer("count").default(1).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [index("rate_limit_buckets_expires_idx").on(table.expiresAt)],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    // Nullable + SET NULL: a deleted user's comments survive as "[deleted user]"
    // rather than cascade-deleting whole threads. Distinct from `deletedAt` (content
    // tombstone); a comment can have a null author yet a null deletedAt. Reads must
    // handle a null author.
    authorId: text("author_id").references(() => user.id, {
      onDelete: "set null",
    }),
    // Self-FK for one level of threaded replies (top-level comment has null).
    parentId: uuid("parent_id").references((): AnyPgColumn => comments.id, {
      onDelete: "cascade",
    }),
    body: text("body").notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    // Soft delete: null = live, timestamp = deleted. Not index-filtered, so threads can
    // render a "[deleted]" tombstone and keep replies; reads decide whether to show it.
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    // Covers a post's comments in created order, and still serves post_id-only lookups.
    index("comments_post_created_idx").on(table.postId, table.createdAt),
    index("comments_parent_id_idx").on(table.parentId),
    // Speeds the ON DELETE SET NULL lookup. Partial: queried only as `author_id = <id>`
    // (strict, excludes NULL), so anonymized deleted-user rows stay out of the index.
    index("comments_author_id_idx")
      .on(table.authorId)
      .where(sql`${table.authorId} is not null`),
  ],
);

export const postLikes = pgTable(
  "post_likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Composite PK DB-enforces one like per user per post.
    primaryKey({ columns: [table.userId, table.postId] }),
    // Reverse index: "who liked this post" + post-delete cascade lookups by post_id.
    index("post_likes_post_id_idx").on(table.postId),
  ],
);

export const commentLikes = pgTable(
  "comment_likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Composite PK DB-enforces one like per user per comment.
    primaryKey({ columns: [table.userId, table.commentId] }),
    // Reverse index: "who liked this comment" + comment-delete cascade lookups.
    index("comment_likes_comment_id_idx").on(table.commentId),
  ],
);

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(user, {
    fields: [posts.authorId],
    references: [user.id],
  }),
  comments: many(comments),
  likes: many(postLikes),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(user, {
    fields: [comments.authorId],
    references: [user.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "comment_replies",
  }),
  replies: many(comments, { relationName: "comment_replies" }),
  likes: many(commentLikes),
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(posts, {
    fields: [postLikes.postId],
    references: [posts.id],
  }),
  user: one(user, {
    fields: [postLikes.userId],
    references: [user.id],
  }),
}));

export const commentLikesRelations = relations(commentLikes, ({ one }) => ({
  comment: one(comments, {
    fields: [commentLikes.commentId],
    references: [comments.id],
  }),
  user: one(user, {
    fields: [commentLikes.userId],
    references: [user.id],
  }),
}));
