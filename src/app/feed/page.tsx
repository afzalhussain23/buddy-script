import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DarkModeToggle } from "./dark-mode-toggle";
import { friends, stories, suggestedPeople, youMightLike } from "./feed-data";
import { FeedNav } from "./feed-nav";
import { FeedTimeline } from "./feed-timeline";
import { getFeedPage } from "./queries";

export default async function FeedPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const { posts, nextCursor } = await getFeedPage(session.user.id);

  return (
    <div className="_layout _layout_main_wrapper">
      <DarkModeToggle />

      <div className="_main_layout">
        <FeedNav name={session.user.name} />

        <div className="container _custom_container">
          <div className="_layout_inner_wrap">
            <div className="row">
              {/* Left Sidebar */}
              <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
                <div className="_layout_left_sidebar_wrap">
                  <div className="_layout_left_sidebar_inner">
                    <div className="_left_inner_area_explore _padd_t24 _padd_b6 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
                      <h4 className="_left_inner_area_explore_title _title5 _mar_b24">
                        Explore
                      </h4>
                      <ul className="_left_inner_area_explore_list">
                        {[
                          "Learning",
                          "Insights",
                          "Find friends",
                          "Bookmarks",
                          "Group",
                          "Gaming",
                          "Settings",
                          "Save post",
                        ].map((label) => (
                          <li
                            key={label}
                            className="_left_inner_area_explore_item"
                          >
                            <a
                              href="#0"
                              className="_left_inner_area_explore_link"
                            >
                              <svg
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                fill="none"
                                viewBox="0 0 20 20"
                              >
                                <circle cx="10" cy="10" r="9" stroke="#666" />
                              </svg>
                              {label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="_layout_left_sidebar_inner">
                    <div className="_left_inner_area_suggest _padd_t24 _padd_b6 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
                      <div className="_left_inner_area_suggest_content _mar_b24">
                        <h4 className="_left_inner_area_suggest_content_title _title5">
                          Suggested People
                        </h4>
                        <span className="_left_inner_area_suggest_content_txt">
                          <a
                            className="_left_inner_area_suggest_content_txt_link"
                            href="#0"
                          >
                            See All
                          </a>
                        </span>
                      </div>
                      {suggestedPeople.map((p, i) => (
                        <div
                          className="_left_inner_area_suggest_info"
                          key={`${p.name}-${i}`}
                        >
                          <div className="_left_inner_area_suggest_info_box">
                            <div className="_left_inner_area_suggest_info_image">
                              <a href="#0">
                                {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
                                <img
                                  src={p.image}
                                  alt=""
                                  className="_info_img"
                                />
                              </a>
                            </div>
                            <div className="_left_inner_area_suggest_info_txt">
                              <a href="#0">
                                <h4 className="_left_inner_area_suggest_info_title">
                                  {p.name}
                                </h4>
                              </a>
                              <p className="_left_inner_area_suggest_info_para">
                                {p.role}
                              </p>
                            </div>
                          </div>
                          <div className="_left_inner_area_suggest_info_link">
                            <a href="#0" className="_info_link">
                              Connect
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="_layout_left_sidebar_inner">
                    <div className="_left_inner_area_event _padd_t24 _padd_b6 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
                      <div className="_left_inner_event_content">
                        <h4 className="_left_inner_event_title _title5">
                          Events
                        </h4>
                        <a href="#0" className="_left_inner_event_link">
                          See all
                        </a>
                      </div>
                      {[0, 1].map((i) => (
                        <div className="_left_inner_event_card_link" key={i}>
                          <div className="_left_inner_event_card">
                            <div className="_left_inner_event_card_iamge">
                              {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
                              <img
                                src="/assets/images/feed_event1.png"
                                alt=""
                                className="_card_img"
                              />
                            </div>
                            <div className="_left_inner_event_card_content">
                              <div className="_left_inner_card_date">
                                <p className="_left_inner_card_date_para">10</p>
                                <p className="_left_inner_card_date_para1">
                                  Jul
                                </p>
                              </div>
                              <div className="_left_inner_card_txt">
                                <h4 className="_left_inner_event_card_title">
                                  No more terrorism no more cry
                                </h4>
                              </div>
                            </div>
                            <hr className="_underline" />
                            <div className="_left_inner_event_bottom">
                              <p className="_left_iner_event_bottom">
                                17 People Going
                              </p>
                              <button
                                type="button"
                                className="_left_iner_event_bottom_link"
                              >
                                Going
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Column */}
              <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12">
                <div className="_layout_middle_wrap">
                  <div className="_layout_middle_inner">
                    {/* Stories */}
                    <div className="_feed_inner_ppl_card _mar_b16">
                      <div className="row">
                        <div className="col-xl-3 col-lg-3 col-md-4 col-sm-4 col">
                          <div className="_feed_inner_profile_story _b_radious6">
                            <div className="_feed_inner_profile_story_image">
                              {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
                              <img
                                src="/assets/images/card_ppl1.png"
                                alt=""
                                className="_profile_story_img"
                              />
                              <div className="_feed_inner_story_txt">
                                <div className="_feed_inner_story_btn">
                                  <button
                                    type="button"
                                    className="_feed_inner_story_btn_link"
                                  >
                                    <svg
                                      aria-hidden="true"
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="10"
                                      height="10"
                                      fill="none"
                                      viewBox="0 0 10 10"
                                    >
                                      <path
                                        stroke="#fff"
                                        strokeLinecap="round"
                                        d="M.5 4.884h9M4.884 9.5v-9"
                                      />
                                    </svg>
                                  </button>
                                </div>
                                <p className="_feed_inner_story_para">
                                  Your Story
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        {stories.map((s, i) => (
                          <div
                            className={`col-xl-3 col-lg-3 col-md-4 col-sm-4${i === 0 ? " col" : i === 1 ? " _custom_mobile_none" : " _custom_none"}`}
                            key={`${s.name}-${i}`}
                          >
                            <div className="_feed_inner_public_story _b_radious6">
                              <div className="_feed_inner_public_story_image">
                                {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
                                <img
                                  src={s.image}
                                  alt=""
                                  className="_public_story_img"
                                />
                                <div className="_feed_inner_pulic_story_txt">
                                  <p className="_feed_inner_pulic_story_para">
                                    {s.name}
                                  </p>
                                </div>
                                {s.mini ? (
                                  <div className="_feed_inner_public_mini">
                                    {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
                                    <img
                                      src={s.mini}
                                      alt=""
                                      className="_public_mini_img"
                                    />
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Create post + timeline */}
                    <FeedTimeline
                      initialPosts={posts}
                      initialCursor={nextCursor}
                      currentUserName={session.user.name}
                    />
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
                <div className="_layout_right_sidebar_wrap">
                  <div className="_layout_right_sidebar_inner">
                    <div className="_right_inner_area_info _padd_t24 _padd_b24 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
                      <div className="_right_inner_area_info_content _mar_b24">
                        <h4 className="_right_inner_area_info_content_title _title5">
                          You Might Like
                        </h4>
                        <span className="_right_inner_area_info_content_txt">
                          <a
                            className="_right_inner_area_info_content_txt_link"
                            href="#0"
                          >
                            See All
                          </a>
                        </span>
                      </div>
                      <hr className="_underline" />
                      {youMightLike.map((p, i) => (
                        <div
                          className="_right_inner_area_info_ppl"
                          key={`${p.name}-${i}`}
                        >
                          <div className="_right_inner_area_info_box">
                            <div className="_right_inner_area_info_box_image">
                              <a href="#0">
                                {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
                                <img
                                  src={p.image}
                                  alt=""
                                  className="_ppl_img"
                                />
                              </a>
                            </div>
                            <div className="_right_inner_area_info_box_txt">
                              <a href="#0">
                                <h4 className="_right_inner_area_info_box_title">
                                  {p.name}
                                </h4>
                              </a>
                              <p className="_right_inner_area_info_box_para">
                                {p.role}
                              </p>
                            </div>
                          </div>
                          <div className="_right_info_btn_grp">
                            <button
                              type="button"
                              className="_right_info_btn_link"
                            >
                              Ignore
                            </button>
                            <button
                              type="button"
                              className="_right_info_btn_link _right_info_btn_link_active"
                            >
                              Follow
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="_layout_right_sidebar_inner">
                    <div className="_feed_right_inner_area_card _padd_t24 _padd_b6 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
                      <div className="_feed_top_fixed">
                        <div className="_feed_right_inner_area_card_content _mar_b24">
                          <h4 className="_feed_right_inner_area_card_content_title _title5">
                            Your Friends
                          </h4>
                          <span className="_feed_right_inner_area_card_content_txt">
                            <a
                              className="_feed_right_inner_area_card_content_txt_link"
                              href="#0"
                            >
                              See All
                            </a>
                          </span>
                        </div>
                        <form className="_feed_right_inner_area_card_form">
                          <svg
                            aria-hidden="true"
                            className="_feed_right_inner_area_card_form_svg"
                            xmlns="http://www.w3.org/2000/svg"
                            width="17"
                            height="17"
                            fill="none"
                            viewBox="0 0 17 17"
                          >
                            <circle cx="7" cy="7" r="6" stroke="#666" />
                            <path
                              stroke="#666"
                              strokeLinecap="round"
                              d="M16 16l-3-3"
                            />
                          </svg>
                          <input
                            className="form-control me-2 _feed_right_inner_area_card_form_inpt"
                            type="search"
                            placeholder="input search text"
                            aria-label="Search"
                          />
                        </form>
                      </div>
                      <div className="_feed_bottom_fixed">
                        {friends.map((f, i) => (
                          <div
                            className={`_feed_right_inner_area_card_ppl${f.status === "offline" ? " _feed_right_inner_area_card_ppl_inactive" : ""}`}
                            key={`${f.name}-${i}`}
                          >
                            <div className="_feed_right_inner_area_card_ppl_box">
                              <div className="_feed_right_inner_area_card_ppl_image">
                                <a href="#0">
                                  {/* biome-ignore lint/performance/noImgElement: theme markup parity */}
                                  <img
                                    src={f.image}
                                    alt=""
                                    className="_box_ppl_img"
                                  />
                                </a>
                              </div>
                              <div className="_feed_right_inner_area_card_ppl_txt">
                                <a href="#0">
                                  <h4 className="_feed_right_inner_area_card_ppl_title">
                                    {f.name}
                                  </h4>
                                </a>
                                <p className="_feed_right_inner_area_card_ppl_para">
                                  {f.role}
                                </p>
                              </div>
                            </div>
                            <div className="_feed_right_inner_area_card_ppl_side">
                              {f.status === "online" ? (
                                <svg
                                  aria-hidden="true"
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  fill="none"
                                  viewBox="0 0 14 14"
                                >
                                  <rect
                                    width="12"
                                    height="12"
                                    x="1"
                                    y="1"
                                    fill="#0ACF83"
                                    stroke="#fff"
                                    strokeWidth="2"
                                    rx="6"
                                  />
                                </svg>
                              ) : (
                                <span>{f.lastSeen}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
