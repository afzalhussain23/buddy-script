"use client";

import { useEffect, useRef, useState } from "react";
import { CommentBox } from "./comment-box";
import type { Post } from "./feed-data";
import {
  CommentIcon,
  HahaEmoji,
  HeartIcon,
  postMenuItems,
  ShareIcon,
  ThreeDotsIcon,
  ThumbsUpIcon,
} from "./feed-icons";

export function PostCard({ post }: { post: Post }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
              <img src={post.avatar} alt="" className="_post_img" />
            </div>
            <div className="_feed_inner_timeline_post_box_txt">
              <h4 className="_feed_inner_timeline_post_box_title">
                {post.author}
              </h4>
              <p className="_feed_inner_timeline_post_box_para">
                {post.time} . <a href="#0">{post.audience}</a>
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
        <h4 className="_feed_inner_timeline_post_title">{post.title}</h4>
        <div className="_feed_inner_timeline_image">
          {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
          <img src={post.image} alt="" className="_time_img" />
        </div>
      </div>

      <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26">
        <div className="_feed_inner_timeline_total_reacts_image">
          {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
          <img
            src="/assets/images/react_img1.png"
            alt=""
            className="_react_img1"
          />
          {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
          <img
            src="/assets/images/react_img2.png"
            alt=""
            className="_react_img"
          />
          {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
          <img
            src="/assets/images/react_img3.png"
            alt=""
            className="_react_img _rect_img_mbl_none"
          />
          {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
          <img
            src="/assets/images/react_img4.png"
            alt=""
            className="_react_img _rect_img_mbl_none"
          />
          {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
          <img
            src="/assets/images/react_img5.png"
            alt=""
            className="_react_img _rect_img_mbl_none"
          />
          <p className="_feed_inner_timeline_total_reacts_para">9+</p>
        </div>
        <div className="_feed_inner_timeline_total_reacts_txt">
          <p className="_feed_inner_timeline_total_reacts_para1">
            <a href="#0">
              <span>{post.comments}</span> Comment
            </a>
          </p>
          <p className="_feed_inner_timeline_total_reacts_para2">
            <span>{post.shares}</span> Share
          </p>
        </div>
      </div>

      <div className="_feed_inner_timeline_reaction">
        <button
          type="button"
          className="_feed_inner_timeline_reaction_emoji _feed_reaction _feed_reaction_active"
        >
          <span className="_feed_inner_timeline_reaction_link">
            <span>
              <HahaEmoji />
              Haha
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

      <div className="_timline_comment_main">
        <div className="_previous_comment">
          <button type="button" className="_previous_comment_txt">
            View {post.previousComments} previous comments
          </button>
        </div>
        <div className="_comment_main">
          <div className="_comment_image">
            <a href="#0" className="_comment_image_link">
              {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
              <img
                src={post.topComment.avatar}
                alt=""
                className="_comment_img1"
              />
            </a>
          </div>
          <div className="_comment_area">
            <div className="_comment_details">
              <div className="_comment_details_top">
                <div className="_comment_name">
                  <a href="#0">
                    <h4 className="_comment_name_title">
                      {post.topComment.author}
                    </h4>
                  </a>
                </div>
              </div>
              <div className="_comment_status">
                <p className="_comment_status_text">
                  <span>{post.topComment.text}</span>
                </p>
              </div>
              <div className="_total_reactions">
                <div className="_total_react">
                  <span className="_reaction_like">
                    <ThumbsUpIcon />
                  </span>
                  <span className="_reaction_heart">
                    <HeartIcon />
                  </span>
                </div>
                <span className="_total">{post.topComment.reactions}</span>
              </div>
              <div className="_comment_reply">
                <div className="_comment_reply_num">
                  <ul className="_comment_reply_list">
                    <li>
                      <span>Like.</span>
                    </li>
                    <li>
                      <span>Reply.</span>
                    </li>
                    <li>
                      <span>Share</span>
                    </li>
                    <li>
                      <span className="_time_link">
                        .{post.topComment.time}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <CommentBox avatar="/assets/images/comment_img.png" />
          </div>
        </div>
      </div>
    </div>
  );
}
