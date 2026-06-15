"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { Avatar } from "@/components/avatar";
import { createComment, createReply } from "./actions";
import { AttachIcon, SmileIcon } from "./feed-icons";
import type { FeedComment } from "./queries";

type ComposerResult = Awaited<ReturnType<typeof createComment>>;
type OnCreated = (comment: FeedComment, commentCount: number) => void;

type ComposerFrameProps = {
  name: string;
  placeholder: string;
  emptyError: string;
  lengthError: string;
  failureError: string;
  submitLabel: string;
  submit: (body: string) => Promise<ComposerResult>;
  onCreated: OnCreated;
};

export function CommentComposer({
  name,
  postId,
  onCreated,
}: {
  name: string;
  postId: string;
  onCreated: OnCreated;
}) {
  return (
    <ComposerFrame
      name={name}
      placeholder="Write a comment"
      emptyError="Write a comment before posting."
      lengthError="Comment must be at most 2,000 characters."
      failureError="Could not post comment. Please try again."
      submitLabel="Post"
      submit={(body) => createComment({ postId, body })}
      onCreated={onCreated}
    />
  );
}

export function ReplyComposer({
  name,
  postId,
  parentId,
  onCreated,
}: {
  name: string;
  postId: string;
  parentId: string;
  onCreated: OnCreated;
}) {
  return (
    <ComposerFrame
      name={name}
      placeholder="Write a reply"
      emptyError="Write a reply before posting."
      lengthError="Reply must be at most 2,000 characters."
      failureError="Could not post reply. Please try again."
      submitLabel="Reply"
      submit={(body) => createReply({ postId, parentId, body })}
      onCreated={onCreated}
    />
  );
}

function ComposerFrame({
  name,
  placeholder,
  emptyError,
  lengthError,
  failureError,
  submitLabel,
  submit,
  onCreated,
}: ComposerFrameProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextBody = body.trim();

    if (!nextBody) {
      setError(emptyError);
      return;
    }
    if (nextBody.length > 2000) {
      setError(lengthError);
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const result = await submit(nextBody);
        if (result.ok) {
          setBody("");
          onCreated(result.comment, result.commentCount);
        } else {
          setError(result.fieldErrors?.body?.[0] ?? result.error);
        }
      } catch {
        setError(failureError);
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
            <Avatar name={name} size={26} className="_comment_img" />
          </div>
          <div className="_feed_inner_comment_box_content_txt">
            <textarea
              className="form-control _comment_textarea"
              placeholder={placeholder}
              aria-label={placeholder}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${submitLabel}BodyError` : undefined}
              maxLength={2000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPending}
            />
          </div>
        </div>
        <div className="_feed_inner_comment_box_icon">
          <button
            type="button"
            aria-label="Add emoji"
            className="_feed_inner_comment_box_icon_btn"
          >
            <SmileIcon />
          </button>
          <button
            type="button"
            aria-label="Attach file"
            className="_feed_inner_comment_box_icon_btn"
          >
            <AttachIcon />
          </button>
          <button
            type="submit"
            className="_feed_inner_comment_box_icon_btn"
            disabled={isPending}
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            {isPending ? "Posting…" : submitLabel}
          </button>
        </div>
      </form>
      {error ? (
        <p
          id={`${submitLabel}BodyError`}
          className="_feed_inner_timeline_post_box_para"
          style={{ color: "#d92d20", margin: "6px 0 0 34px" }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
