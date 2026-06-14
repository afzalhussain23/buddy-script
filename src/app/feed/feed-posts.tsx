"use client";

import { useState, useTransition } from "react";
import { loadMorePosts } from "./actions";
import { PostCard } from "./post-card";
import type { FeedCursor, FeedPost } from "./queries";

export function FeedPosts({
  initialPosts,
  initialCursor,
}: {
  initialPosts: FeedPost[];
  initialCursor: FeedCursor | null;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const next = await loadMorePosts(cursor);
      setPosts((prev) => [...prev, ...next.posts]);
      setCursor(next.nextCursor);
    });
  }

  if (posts.length === 0) {
    return (
      <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _padd_r24 _padd_l24 _mar_b16">
        <p className="_feed_inner_timeline_post_box_para" style={{ margin: 0 }}>
          No posts yet. Be the first to share something.
        </p>
      </div>
    );
  }

  return (
    <>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {cursor ? (
        <div
          className="_feed_inner_text_area _b_radious6 _padd_b24 _padd_t24 _padd_r24 _padd_l24 _mar_b16"
          style={{ textAlign: "center" }}
        >
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isPending}
            className="_feed_inner_text_area_btn_link"
          >
            <span>{isPending ? "Loading..." : "Load more"}</span>
          </button>
        </div>
      ) : null}
    </>
  );
}
