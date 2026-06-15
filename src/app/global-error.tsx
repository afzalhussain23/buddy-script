"use client";

import { useEffect } from "react";

// Last line of defence: catches errors thrown anywhere the route-level
// boundaries don't, including failures in the root layout itself. Because it
// replaces the root layout, it must render its own <html>/<body> and can't rely
// on the app's fonts or theme stylesheets — styles are inlined and kept minimal.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "var(--font-poppins), Arial, Helvetica, sans-serif",
          background: "#f6f6f6",
          color: "#112032",
        }}
      >
        <main
          role="alert"
          style={{
            maxWidth: "420px",
            textAlign: "center",
            background: "#fff",
            borderRadius: "12px",
            padding: "40px 32px",
            boxShadow: "rgba(149, 157, 165, 0.2) 0px 8px 24px",
          }}
        >
          <h1 style={{ fontSize: "22px", margin: "0 0 12px", fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 24px", color: "#8c8f95", lineHeight: 1.5 }}>
            An unexpected error occurred. Please try again — if it keeps
            happening, come back in a little while.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "12px 32px",
              background: "#1890FF",
              border: "1px solid transparent",
              borderRadius: "6px",
              fontWeight: 500,
              fontSize: "16px",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
