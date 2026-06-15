"use client";

import { useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { MAX_IMAGE_UPLOAD_BYTES, uploadImageToR2 } from "@/lib/image-upload";
import type { FieldErrors } from "@/lib/validation";
import { createPost } from "./actions";
import {
  ArticleIcon,
  EventIcon,
  PencilIcon,
  PhotoIcon,
  SendIcon,
  VideoIcon,
} from "./feed-icons";
import type { FeedPost } from "./queries";

export function CreatePost({
  onCreated,
  currentUserName,
}: {
  onCreated: (post: FeedPost) => void;
  currentUserName: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  function chooseImage(file: File | undefined) {
    setError(null);
    setFieldErrors({});
    if (!file) return;
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setImage(null);
      setError("Image must be 5 MB or smaller.");
      return;
    }
    setImage(file);
  }

  function handleSubmit() {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      try {
        const uploadId = image ? await uploadImageToR2(image) : null;
        const result = await createPost({ body, uploadId });
        if (!result.ok) {
          setFieldErrors(result.fieldErrors ?? {});
          if (!result.fieldErrors || !Object.keys(result.fieldErrors).length) {
            setError(result.error);
          }
          return;
        }
        onCreated(result.post);
        setBody("");
        setImage(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Could not create post.",
        );
      }
    });
  }

  return (
    <div className="_feed_inner_text_area _b_radious6 _padd_b24 _padd_t24 _padd_r24 _padd_l24 _mar_b16">
      <div className="_feed_inner_text_area_box">
        <div className="_feed_inner_text_area_box_image">
          <Avatar name={currentUserName} size={40} className="_txt_img" />
        </div>
        <div className="form-floating _feed_inner_text_area_box_form">
          <textarea
            id="floatingTextarea"
            className="form-control _textarea"
            placeholder="Leave a comment here"
            value={body}
            maxLength={5000}
            aria-invalid={Boolean(fieldErrors.body)}
            aria-describedby={fieldErrors.body ? "postBodyError" : undefined}
            onChange={(event) => setBody(event.target.value)}
          />
          {body ? null : (
            <label className="_feed_textarea_label" htmlFor="floatingTextarea">
              Write something…
              <PencilIcon />
            </label>
          )}
        </div>
      </div>

      {fieldErrors.body?.[0] ? (
        <p
          id="postBodyError"
          role="alert"
          style={{ margin: "12px 0 0", color: "#c62828" }}
        >
          {fieldErrors.body[0]}
        </p>
      ) : null}

      {image ? (
        <p style={{ margin: "12px 0 0", color: "#666" }}>
          {image.name} ({(image.size / 1024 / 1024).toFixed(1)} MB)
          <button
            type="button"
            onClick={() => setImage(null)}
            style={{ marginLeft: 8 }}
          >
            Remove
          </button>
        </p>
      ) : null}
      {fieldErrors.uploadId?.[0] ? (
        <p role="alert" style={{ margin: "12px 0 0", color: "#c62828" }}>
          {fieldErrors.uploadId[0]}
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ margin: "12px 0 0", color: "#c62828" }}>
          {error}
        </p>
      ) : null}

      <div className="_feed_inner_text_area_bottom">
        <div className="_feed_inner_text_area_item">
          <div className="_feed_inner_text_area_bottom_photo _feed_common">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(event) => chooseImage(event.target.files?.[0])}
            />
            <button
              type="button"
              className="_feed_inner_text_area_bottom_photo_link"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
            >
              <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img">
                <PhotoIcon />
              </span>
              Photo
            </button>
          </div>
          <div className="_feed_inner_text_area_bottom_video _feed_common">
            <button
              type="button"
              className="_feed_inner_text_area_bottom_photo_link"
            >
              <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img">
                <VideoIcon />
              </span>
              Video
            </button>
          </div>
          <div className="_feed_inner_text_area_bottom_event _feed_common">
            <button
              type="button"
              className="_feed_inner_text_area_bottom_photo_link"
            >
              <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img">
                <EventIcon />
              </span>
              Event
            </button>
          </div>
          <div className="_feed_inner_text_area_bottom_article _feed_common">
            <button
              type="button"
              className="_feed_inner_text_area_bottom_photo_link"
            >
              <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img">
                <ArticleIcon />
              </span>
              Article
            </button>
          </div>
        </div>
        <div className="_feed_inner_text_area_btn">
          <button
            type="button"
            className="_feed_inner_text_area_btn_link"
            onClick={handleSubmit}
            disabled={isPending || (!body.trim() && !image)}
          >
            <SendIcon />
            <span>{isPending ? "Posting…" : "Post"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
