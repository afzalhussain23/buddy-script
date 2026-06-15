import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Feed",
};

// The /feed screen reuses the original Buddy Script theme (Bootstrap + the
// bundled common/main/responsive stylesheets). They're scoped to this route by
// rendering the <link> tags here rather than importing them globally, so the
// rest of the app keeps its own styling. Backend wiring comes later.
export default function FeedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* Poppins is self-hosted via next/font in the root layout (--font-poppins). */}
      {/* Theme stylesheets (order matters: bootstrap first, then overrides) */}
      <link rel="stylesheet" href="/assets/css/bootstrap.min.css" />
      <link rel="stylesheet" href="/assets/css/common.css" />
      <link rel="stylesheet" href="/assets/css/main.css" />
      <link rel="stylesheet" href="/assets/css/responsive.css" />

      {children}

      {/* Bootstrap bundle powers the collapsible mobile navbar. */}
      <Script
        src="/assets/js/bootstrap.bundle.min.js"
        strategy="afterInteractive"
      />
    </>
  );
}
