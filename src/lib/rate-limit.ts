import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { after } from "next/server";
import { redis } from "./redis";

type Duration = Parameters<typeof Ratelimit.slidingWindow>[1];

// One rule per protected action. Windows differ by intent: the write actions use
// long windows to cap sustained authoring; likes and reads use short windows so
// a legitimate user who briefly bursts recovers in seconds rather than minutes.
const RULES = {
  "create-post": { tokens: 20, window: "10 m" },
  "create-comment": { tokens: 30, window: "10 m" },
  "image-upload": { tokens: 10, window: "10 m" },
  "toggle-like": { tokens: 100, window: "1 m" },
  "feed-read": { tokens: 120, window: "1 m" },
} satisfies Record<string, { tokens: number; window: Duration }>;

export type RateLimitAction = keyof typeof RULES;

// Limiters are constructed once and reused so each keeps its own ephemeral cache
// of already-blocked identifiers, short-circuiting Redis round trips under abuse.
const limiters = new Map<RateLimitAction, Ratelimit>();

function getLimiter(action: RateLimitAction): Ratelimit {
  let limiter = limiters.get(action);
  if (!limiter) {
    const { tokens, window } = RULES[action];
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: `rl:${action}`,
      analytics: true,
    });
    limiters.set(action, limiter);
  }
  return limiter;
}

export async function consumeRateLimit(
  action: RateLimitAction,
  identifier: string,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const { success, reset, pending } =
    await getLimiter(action).limit(identifier);
  // Let analytics/sync writes finish after the response on serverless.
  after(pending);
  return {
    allowed: success,
    retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
  };
}
