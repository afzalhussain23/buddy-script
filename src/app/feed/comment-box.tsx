"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { createComment, createReply } from "./actions";
import { AttachIcon, SmileIcon } from "./feed-icons";
import type { FeedComment } from "./queries";

// The "Write a comment" composer, reused under each post and reply thread.
export function CommentBox({
  avatar,
  postId,
  parentId,
  onCreated,
}: {
  avatar: string;
  postId: string;
  parentId?: string;
  onCreated: (comment: FeedComment, commentCount: number) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextBody = body.trim();

    if (!nextBody) {
      setError(
        parentId
          ? "Write a reply before posting."
          : "Write a comment before posting.",
      );
      return;
    }
    if (nextBody.length > 2000) {
      setError(
        `${parentId ? "Reply" : "Comment"} must be at most 2,000 characters.`,
      );
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const result = parentId
          ? await createReply({ postId, parentId, body: nextBody })
          : await createComment({ postId, body: nextBody });
        if (result.ok) {
          setBody("");
          onCreated(result.comment, result.commentCount);
        } else {
          setError(result.error);
        }
      } catch {
        setError(
          `Could not post ${parentId ? "reply" : "comment"}. Please try again.`,
        );
      }
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <div className="_feed_inner_comment_box">
      <form
        ref={formRef}
        className="_feed_inner_comment_box_form"
        onSubmit={handleSubmit}
      >
        <div className="_feed_inner_comment_box_content">
          <div className="_feed_inner_comment_box_content_image">
            {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
            <img src={avatar} alt="" className="_comment_img" />
          </div>
          <div className="_feed_inner_comment_box_content_txt">
            <textarea
              className="form-control _comment_textarea"
              placeholder={parentId ? "Write a reply" : "Write a comment"}
              aria-label={parentId ? "Write a reply" : "Write a comment"}
              maxLength={2000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPending}
            />
          </div>
        </div>
        <div className="_feed_inner_comment_box_icon">
          <button type="button" className="_feed_inner_comment_box_icon_btn">
            <SmileIcon />
          </button>
          <button type="button" className="_feed_inner_comment_box_icon_btn">
            <AttachIcon />
          </button>
          <button
            type="submit"
            className="_feed_inner_comment_box_icon_btn"
            disabled={isPending}
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            {isPending ? "Posting" : parentId ? "Reply" : "Post"}
          </button>
        </div>
      </form>
      {error ? (
        <p
          className="_feed_inner_timeline_post_box_para"
          style={{ color: "#d92d20", margin: "6px 0 0 34px" }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
