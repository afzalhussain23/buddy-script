import { AttachIcon, SmileIcon } from "./feed-icons";

// The "Write a comment" composer, reused under each post and reply thread.
export function CommentBox({ avatar }: { avatar: string }) {
  return (
    <div className="_feed_inner_comment_box">
      <form className="_feed_inner_comment_box_form">
        <div className="_feed_inner_comment_box_content">
          <div className="_feed_inner_comment_box_content_image">
            {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
            <img src={avatar} alt="" className="_comment_img" />
          </div>
          <div className="_feed_inner_comment_box_content_txt">
            <textarea
              className="form-control _comment_textarea"
              placeholder="Write a comment"
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
        </div>
      </form>
    </div>
  );
}
