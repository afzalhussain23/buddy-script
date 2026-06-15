import Link from "next/link";

// Rendered inside the root layout, which loads only globals.css (the feed/auth
// theme stylesheets are scoped to their own layouts). Styles are inlined so the
// page looks intentional without pulling in the theme.
export default function NotFound() {
  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "24px",
        fontFamily: "var(--font-poppins), Arial, Helvetica, sans-serif",
      }}
    >
      <p style={{ fontSize: "48px", fontWeight: 700, margin: "0 0 8px" }}>
        404
      </p>
      <h1 style={{ fontSize: "22px", fontWeight: 600, margin: "0 0 12px" }}>
        Page not found
      </h1>
      <p style={{ margin: "0 0 24px", color: "#8c8f95", maxWidth: "360px" }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/feed"
        style={{
          padding: "12px 32px",
          background: "#1890FF",
          borderRadius: "6px",
          fontWeight: 500,
          fontSize: "16px",
          color: "#fff",
        }}
      >
        Back to feed
      </Link>
    </main>
  );
}
