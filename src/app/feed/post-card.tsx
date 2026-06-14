"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toggleLike } from "./actions";
import { CommentBox } from "./comment-box";
import {
  CommentIcon,
  HahaEmoji,
  postMenuItems,
  ShareIcon,
  ThreeDotsIcon,
} from "./feed-icons";
import type { FeedPost } from "./queries";

// Fallback avatar (user images aren't uploaded yet — see auth.user.image).
const DEFAULT_AVATAR = "/assets/images/post_img.png";

export function PostCard({ post }: { post: FeedPost }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isLiking, startLike] = useTransition();

  // Optimistically flip the like + count, then reconcile with the server's
  // authoritative count (or revert on failure). The action is idempotent, so a
  // rapid double-tap or retry can't double-count.
  function handleToggleLike() {
    const prevLiked = liked;
    const prevCount = likeCount;
    const nextLiked = !prevLiked;

    setLiked(nextLiked);
    setLikeCount(nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1));

    startLike(async () => {
      try {
        const res = await toggleLike({ postId: post.id, liked: nextLiked });
        if (res.ok) {
          setLiked(res.liked);
          setLikeCount(res.likeCount);
          return;
        }
      } catch {
        // Restore the previous state below when the server action rejects.
      }

      setLiked(prevLiked);
      setLikeCount(prevCount);
    });
  }

  // Close the post's "..." menu on an outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16">
      <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
        <div className="_feed_inner_timeline_post_top">
          <div className="_feed_inner_timeline_post_box">
            <div className="_feed_inner_timeline_post_box_image">
              {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
              <img
                src={post.authorImage ?? DEFAULT_AVATAR}
                alt=""
                className="_post_img"
              />
            </div>
            <div className="_feed_inner_timeline_post_box_txt">
              <h4 className="_feed_inner_timeline_post_box_title">
                {post.authorName}
              </h4>
              <p className="_feed_inner_timeline_post_box_para">
                {post.time} .{" "}
                <span>{post.isPrivate ? "Private" : "Public"}</span>
              </p>
            </div>
          </div>
          <div className="_feed_inner_timeline_post_box_dropdown" ref={menuRef}>
            <div className="_feed_timeline_post_dropdown">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="_feed_timeline_post_dropdown_link"
              >
                <ThreeDotsIcon />
              </button>
            </div>
            <div
              className={`_feed_timeline_dropdown _timeline_dropdown${menuOpen ? " show" : ""}`}
            >
              <ul className="_feed_timeline_dropdown_list">
                {postMenuItems.map((item) => (
                  <li key={item.label} className="_feed_timeline_dropdown_item">
                    <a href="#0" className="_feed_timeline_dropdown_link">
                      <span>{item.icon}</span>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <h4 className="_feed_inner_timeline_post_title">{post.body}</h4>
        {post.imageUrl ? (
          <div className="_feed_inner_timeline_image">
            {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
            <img src={post.imageUrl} alt="" className="_time_img" />
          </div>
        ) : null}
      </div>

      <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26">
        <div className="_feed_inner_timeline_total_reacts_image">
          <p className="_feed_inner_timeline_total_reacts_para">{likeCount}</p>
        </div>
        <div className="_feed_inner_timeline_total_reacts_txt">
          <p className="_feed_inner_timeline_total_reacts_para1">
            <span>{post.commentCount}</span> Comment
          </p>
        </div>
      </div>

      <div className="_feed_inner_timeline_reaction">
        <button
          type="button"
          onClick={handleToggleLike}
          disabled={isLiking}
          aria-pressed={liked}
          className={`_feed_inner_timeline_reaction_emoji _feed_reaction${liked ? " _feed_reaction_active" : ""}`}
        >
          <span className="_feed_inner_timeline_reaction_link">
            <span>
              <HahaEmoji />
              {liked ? "Liked" : "Like"}
            </span>
          </span>
        </button>
        <button
          type="button"
          className="_feed_inner_timeline_reaction_comment _feed_reaction"
        >
          <span className="_feed_inner_timeline_reaction_link">
            <span>
              <CommentIcon />
              Comment
            </span>
          </span>
        </button>
        <button
          type="button"
          className="_feed_inner_timeline_reaction_share _feed_reaction"
        >
          <span className="_feed_inner_timeline_reaction_link">
            <span>
              <ShareIcon />
              Share
            </span>
          </span>
        </button>
      </div>

      <div className="_feed_inner_timeline_cooment_area">
        <CommentBox avatar="/assets/images/comment_img.png" />
      </div>
    </div>
  );
}
