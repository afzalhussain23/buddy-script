import Script from "next/script";

// The /feed screen reuses the original Buddy Script theme (Bootstrap + the
// bundled common/main/responsive stylesheets). They're scoped to this route by
// rendering the <link> tags here rather than importing them globally, so the
// rest of the app keeps its own styling. Backend wiring comes later.
export default function FeedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;300;400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
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
