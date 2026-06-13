"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function FeedHeader({ name }: { name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on an outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 32px",
        borderBottom: "1px solid #e5e7eb",
        background: "#fff",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: small static logo, layout parity with the theme */}
      <img src="/assets/images/logo.svg" alt="Buddy Script" height={32} />

      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#2c7be8",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            {initial}
          </span>
          <span style={{ fontWeight: 500 }}>{name}</span>
          <span aria-hidden style={{ color: "#9ca3af" }}>
            ▾
          </span>
        </button>

        {open ? (
          <div
            role="menu"
            style={{
              position: "absolute",
              right: 0,
              marginTop: 8,
              minWidth: 160,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              overflow: "hidden",
              zIndex: 10,
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={loggingOut}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                font: "inherit",
                color: "#dc2626",
              }}
            >
              {loggingOut ? "Logging out..." : "Log Out"}
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
