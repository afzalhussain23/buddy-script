"use client";

import { useEffect } from "react";

// Route-level boundary for the feed. Renders inside the feed layout, so the
// theme stylesheets are available. Catches render/data failures in the feed
// page and its server components (e.g. a database outage in getFeedPage).
export default function FeedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Feed route error", error);
  }, [error]);

  return (
    <div
      className="_layout _layout_main_wrapper"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <main
        role="alert"
        className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _padd_r24 _padd_l24"
        style={{ maxWidth: "420px", textAlign: "center" }}
      >
        <h1 className="_title5" style={{ margin: "0 0 12px" }}>
          We couldn&apos;t load your feed
        </h1>
        <p
          className="_feed_inner_timeline_post_box_para"
          style={{ margin: "0 0 24px" }}
        >
          Something went wrong on our end. Please try again in a moment.
        </p>
        <button
          type="button"
          onClick={reset}
          className="_btn1"
          style={{ padding: "12px 48px", cursor: "pointer" }}
        >
          Try again
        </button>
      </main>
    </div>
  );
}
