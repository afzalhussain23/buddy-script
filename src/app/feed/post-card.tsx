"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  loadMoreComments,
  loadMoreReplies,
  toggleCommentLike,
  toggleLike,
} from "./actions";
import { CommentBox } from "./comment-box";
import {
  CommentIcon,
  HahaEmoji,
  postMenuItems,
  ShareIcon,
  ThreeDotsIcon,
  ThumbsUpIcon,
} from "./feed-icons";
import type { FeedComment, FeedPost } from "./queries";

// Fallback avatar (user images aren't uploaded yet — see auth.user.image).
const DEFAULT_AVATAR = "/assets/images/post_img.png";

export function PostCard({ post }: { post: FeedPost }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [loadedComments, setLoadedComments] = useState(post.comments);
  const [newComments, setNewComments] = useState<FeedComment[]>([]);
  const [nextCommentCursor, setNextCommentCursor] = useState(
    post.nextCommentCursor,
  );
  const [commentLoadError, setCommentLoadError] = useState<string | null>(null);
  const [isLiking, startLike] = useTransition();
  const [isLoadingComments, startLoadComments] = useTransition();

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

  function handleCommentCreated(comment: FeedComment, nextCount: number) {
    setNewComments((prev) => [...prev, comment]);
    reconcileCommentCount(nextCount);
  }

  function reconcileCommentCount(nextCount: number) {
    setCommentCount((current) => Math.max(current, nextCount));
  }

  function handleLoadMoreComments() {
    if (!nextCommentCursor) return;

    setCommentLoadError(null);
    startLoadComments(async () => {
      try {
        const result = await loadMoreComments({
          postId: post.id,
          cursor: nextCommentCursor,
        });

        if (result.ok) {
          setLoadedComments((prev) => [...prev, ...result.page.comments]);
          setNextCommentCursor(result.page.nextCursor);
        } else {
          setCommentLoadError(result.error);
        }
      } catch {
        setCommentLoadError("Could not load more comments.");
      }
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
            <span>{commentCount}</span>{" "}
            {commentCount === 1 ? "Comment" : "Comments"}
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
        {loadedComments.map((comment) => (
          <CommentRow
            key={comment.id}
            comment={comment}
            onReplyCreated={reconcileCommentCount}
          />
        ))}
        {nextCommentCursor ? (
          <button
            type="button"
            onClick={handleLoadMoreComments}
            disabled={isLoadingComments}
            className="_feed_inner_comment_box_icon_btn"
            style={{
              cursor: "pointer",
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              margin: "0 0 16px 60px",
              padding: "6px 0",
            }}
          >
            {isLoadingComments ? "Loading comments..." : "Load more comments"}
          </button>
        ) : null}
        {commentLoadError ? (
          <p
            className="_feed_inner_timeline_post_box_para"
            style={{ color: "#d92d20", margin: "0 0 16px 60px" }}
          >
            {commentLoadError}
          </p>
        ) : null}
        {newComments.map((comment) => (
          <CommentRow
            key={comment.id}
            comment={comment}
            onReplyCreated={reconcileCommentCount}
          />
        ))}
        <CommentBox
          avatar="/assets/images/comment_img.png"
          postId={post.id}
          onCreated={handleCommentCreated}
        />
      </div>
    </div>
  );
}

// Per-comment like toggle for both comments and replies. Mirrors the post
// like button: optimistic flip + count, reconciled with the server's
// authoritative count, reverting on failure. The action is idempotent, so a
// rapid double-tap or retry can't double-count.
function CommentLikeButton({ comment }: { comment: FeedComment }) {
  const [liked, setLiked] = useState(comment.likedByMe);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [isLiking, startLike] = useTransition();

  function handleToggleLike() {
    const prevLiked = liked;
    const prevCount = likeCount;
    const nextLiked = !prevLiked;

    setLiked(nextLiked);
    setLikeCount(nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1));

    startLike(async () => {
      try {
        const res = await toggleCommentLike({
          commentId: comment.id,
          liked: nextLiked,
        });
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

  return (
    <button
      type="button"
      onClick={handleToggleLike}
      disabled={isLiking}
      aria-pressed={liked}
      className="_feed_inner_comment_box_icon_btn"
      style={{
        alignItems: "center",
        color: liked ? "#377dff" : undefined,
        display: "inline-flex",
        fontSize: 13,
        fontWeight: 600,
        gap: 5,
        padding: 0,
      }}
    >
      <ThumbsUpIcon />
      {liked ? "Liked" : "Like"}
      {likeCount > 0 ? ` · ${likeCount}` : ""}
    </button>
  );
}

function CommentRow({
  comment,
  onReplyCreated,
}: {
  comment: FeedComment;
  onReplyCreated: (commentCount: number) => void;
}) {
  const [replying, setReplying] = useState(false);
  const [replies, setReplies] = useState(comment.replies);
  const [nextReplyCursor, setNextReplyCursor] = useState(
    comment.nextReplyCursor,
  );
  const [replyLoadError, setReplyLoadError] = useState<string | null>(null);
  const [isLoadingReplies, startLoadReplies] = useTransition();

  function handleReplyCreated(reply: FeedComment, commentCount: number) {
    setReplies((current) => [...current, reply]);
    setReplying(false);
    onReplyCreated(commentCount);
  }

  function handleLoadMoreReplies() {
    if (!nextReplyCursor) return;

    setReplyLoadError(null);
    startLoadReplies(async () => {
      try {
        const result = await loadMoreReplies({
          postId: comment.postId,
          parentId: comment.id,
          cursor: nextReplyCursor,
        });
        if (result.ok) {
          setReplies((current) => {
            const existingIds = new Set(current.map((reply) => reply.id));
            return [
              ...current,
              ...result.page.replies.filter(
                (reply) => !existingIds.has(reply.id),
              ),
            ];
          });
          setNextReplyCursor(result.page.nextCursor);
        } else {
          setReplyLoadError(result.error);
        }
      } catch {
        setReplyLoadError("Could not load more replies.");
      }
    });
  }

  return (
    <div className="_mar_b16">
      <div className="_comment_main">
        <div className="_comment_image">
          {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
          <img
            src={comment.authorImage ?? DEFAULT_AVATAR}
            alt=""
            className="_comment_img1"
          />
        </div>
        <div className="_comment_area">
          <div className="_comment_details" style={{ margin: "0 0 8px" }}>
            <div className="_comment_details_top">
              <div className="_comment_name">
                <h4 className="_comment_name_title">{comment.authorName}</h4>
                <p className="_comment_status_text">{comment.body}</p>
              </div>
            </div>
          </div>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: 12,
              margin: "0 0 12px",
            }}
          >
            <p className="_feed_inner_timeline_post_box_para">{comment.time}</p>
            <CommentLikeButton comment={comment} />
            <button
              type="button"
              onClick={() => setReplying((current) => !current)}
              aria-expanded={replying}
              className="_feed_inner_comment_box_icon_btn"
              style={{ fontSize: 13, fontWeight: 600, padding: 0 }}
            >
              Reply
            </button>
          </div>
        </div>
      </div>
      <div style={{ marginLeft: 48 }}>
        {replies.map((reply) => (
          <ReplyRow key={reply.id} reply={reply} />
        ))}
        {nextReplyCursor ? (
          <button
            type="button"
            onClick={handleLoadMoreReplies}
            disabled={isLoadingReplies}
            className="_feed_inner_comment_box_icon_btn"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              margin: "0 0 16px 12px",
              padding: "6px 0",
            }}
          >
            {isLoadingReplies ? "Loading replies..." : "Load more replies"}
          </button>
        ) : null}
        {replyLoadError ? (
          <p
            className="_feed_inner_timeline_post_box_para"
            style={{ color: "#d92d20", margin: "0 0 16px 12px" }}
          >
            {replyLoadError}
          </p>
        ) : null}
        {replying ? (
          <CommentBox
            avatar="/assets/images/comment_img.png"
            postId={comment.postId}
            parentId={comment.id}
            onCreated={handleReplyCreated}
          />
        ) : null}
      </div>
    </div>
  );
}

function ReplyRow({ reply }: { reply: FeedComment }) {
  return (
    <div className="_comment_main _mar_b16">
      <div className="_comment_image">
        {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
        <img
          src={reply.authorImage ?? DEFAULT_AVATAR}
          alt=""
          className="_comment_img1"
        />
      </div>
      <div className="_comment_area">
        <div className="_comment_details" style={{ margin: "0 0 8px" }}>
          <div className="_comment_details_top">
            <div className="_comment_name">
              <h4 className="_comment_name_title">{reply.authorName}</h4>
              <p className="_comment_status_text">{reply.body}</p>
            </div>
          </div>
        </div>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 12,
          }}
        >
          <p className="_feed_inner_timeline_post_box_para">{reply.time}</p>
          <CommentLikeButton comment={reply} />
        </div>
      </div>
    </div>
  );
}
