# Buddy Script

Buddy Script is a Next.js social feed application based on the provided Login, Register, and Feed designs. It lets users create an account, sign in, and access a protected feed where posts are shown newest first.

The app uses Better Auth for email/password authentication, Drizzle with PostgreSQL/Neon for data storage, and preserves the original Buddy Script visual design with bundled assets and styles.

## Limits

All limits below are enforced server-side.

### Rate limits

Backed by [Upstash Ratelimit](https://github.com/upstash/ratelimit-js) (sliding window, on Upstash Redis). Requires `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

| Action | Limit | Window | Scope |
| --- | --- | --- | --- |
| Sign in / sign up | 3 | 10 s | per IP |
| Create post | 20 | 10 min | per user |
| Create comment / reply | 30 | 10 min | per user |
| Image upload (request signed URL) | 10 | 10 min | per user |
| Like / unlike (posts + comments) | 100 | 1 min | per user |
| Feed reads (load more posts/comments/replies, likers) | 120 | 1 min | per user |

### Resource limits

| Resource | Limit |
| --- | --- |
| Post body | 5,000 characters |
| Comment / reply body | 2,000 characters |
| Image upload size | 5 MB |
| Image types | JPEG, PNG, WebP, GIF |

(Additional low-level guardrails — request body caps, image dimensions, and field lengths — are enforced in code but omitted here.)
