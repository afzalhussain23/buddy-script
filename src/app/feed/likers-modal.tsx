"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/avatar";
import { loadLikers } from "./actions";
import { ThumbsUpIcon } from "./feed-icons";
import type { Liker, LikerCursor } from "./queries";

// "Who liked this" modal for a post, comment, or reply. Data is fetched lazily
// on open (never preloaded with the feed) and paginated newest-first. Rendered
// through a portal to document.body so it escapes the post card's stacking and
// overflow; it reads the active theme from the page wrapper so dark mode keeps
// the same palette as the rest of the feed.
export function LikersModal({
  targetType,
  targetId,
  count,
  onClose,
}: {
  targetType: "post" | "comment";
  targetId: string;
  count: number;
  onClose: () => void;
}) {
  const [likers, setLikers] = useState<Liker[]>([]);
  const [cursor, setCursor] = useState<LikerCursor | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startFetch] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  function fetchPage(after: LikerCursor | null) {
    setError(null);
    startFetch(async () => {
      try {
        const res = await loadLikers({ targetType, targetId, cursor: after });
        if (res.ok) {
          setLikers((prev) =>
            after ? [...prev, ...res.page.likers] : res.page.likers,
          );
          setCursor(res.page.nextCursor);
          setLoaded(true);
        } else {
          setError(res.error);
        }
      } catch {
        setError("Could not load likes.");
      }
    });
  }

  // Mount-only: portal target + theme detection + the first (lazy) page load.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on open.
  useEffect(() => {
    setMounted(true);
    setDark(
      Boolean(document.querySelector("._layout_main_wrapper._dark_wrapper")),
    );
    fetchPage(null);
  }, []);

  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // Move focus into the dialog on open, trap Tab within it, and restore focus
  // to the triggering element on close.
  useEffect(() => {
    if (!mounted) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    function onTab(e: KeyboardEvent) {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onTab);
    return () => {
      document.removeEventListener("keydown", onTab);
      previouslyFocused?.focus?.();
    };
  }, [mounted]);

  if (!mounted) return null;

  const surface = dark ? "#112032" : "#ffffff";
  const textColor = dark ? "#ffffff" : "#1a202c";
  const mutedColor = dark ? "#9aa6b8" : "#65676b";
  const borderColor = dark ? "#1f3147" : "#e4e6eb";

  return createPortal(
    <div
      style={{
        alignItems: "center",
        display: "flex",
        inset: 0,
        justifyContent: "center",
        padding: 16,
        position: "fixed",
        zIndex: 1000,
      }}
    >
      {/* Click-the-backdrop-to-close, as its own focusable control so the
          interaction lives on a real button rather than the overlay div. */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{
          background: "rgba(0, 0, 0, 0.55)",
          border: "none",
          cursor: "default",
          inset: 0,
          position: "fixed",
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="People who liked this"
        tabIndex={-1}
        style={{
          position: "relative",
          zIndex: 1,
          background: surface,
          borderRadius: 12,
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
          color: textColor,
          display: "flex",
          flexDirection: "column",
          maxHeight: "80vh",
          maxWidth: 420,
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            borderBottom: `1px solid ${borderColor}`,
            display: "flex",
            gap: 8,
            justifyContent: "space-between",
            padding: "16px 20px",
          }}
        >
          <h4
            style={{
              alignItems: "center",
              display: "flex",
              fontSize: 16,
              fontWeight: 600,
              gap: 8,
              margin: 0,
            }}
          >
            <ThumbsUpIcon />
            {count} {count === 1 ? "Like" : "Likes"}
          </h4>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: mutedColor,
              cursor: "pointer",
              fontSize: 22,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "8px 0" }}>
          {likers.map((liker) => (
            <div
              key={liker.userId}
              style={{
                alignItems: "center",
                display: "flex",
                gap: 12,
                padding: "8px 20px",
              }}
            >
              <Avatar name={liker.name} image={liker.image} size={40} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {liker.name}
              </span>
            </div>
          ))}

          {loaded && likers.length === 0 ? (
            <p style={{ color: mutedColor, margin: 0, padding: "16px 20px" }}>
              No likes yet.
            </p>
          ) : null}

          {error ? (
            <p style={{ color: "#d92d20", margin: 0, padding: "12px 20px" }}>
              {error}
            </p>
          ) : null}

          {cursor ? (
            <button
              type="button"
              onClick={() => fetchPage(cursor)}
              disabled={isPending}
              style={{
                background: "transparent",
                border: "none",
                color: "#377dff",
                cursor: isPending ? "default" : "pointer",
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                padding: "10px 20px",
                textAlign: "left",
                width: "100%",
              }}
            >
              {isPending ? "Loading…" : "Show more"}
            </button>
          ) : null}

          {!loaded && isPending ? (
            <p style={{ color: mutedColor, margin: 0, padding: "16px 20px" }}>
              Loading…
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
