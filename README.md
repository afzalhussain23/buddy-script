# Buddy Script

Buddy Script is a Next.js social feed application based on the provided Login, Register, and Feed designs. It lets users create an account, sign in, and access a protected feed where posts are shown newest first.

**🌐 Live demo:** https://buddy-script-silk.vercel.app/

> [!TIP]
> Sign in with the seeded test account — no registration needed:
> **Email:** `test@buddyscript.dev` &nbsp;·&nbsp; **Password:** `password123`

## Video demo

📺 **Watch the walkthrough:** https://youtu.be/zEz9beSKics

[![Buddy Script demo](https://img.youtube.com/vi/zEz9beSKics/maxresdefault.jpg)](https://youtu.be/zEz9beSKics)

## Tech stack

- **Next.js 16** (App Router) with **React 19** — Server Components and Server Actions
- **Better Auth** — email/password authentication
- **Drizzle ORM** on **Neon Postgres** — data storage
- **Upstash Redis + Ratelimit** — rate limiting and ephemeral state
- **AWS S3 SDK** — presigned uploads to **Cloudflare R2**
- **pnpm** — package management
- **Biome** — lint/format

## Codebase overview

The app is server-first: pages render on the server and use client components only where there's interactivity (forms, likes, dark-mode toggle). Mutations go through Server Actions; the few API routes exist for what Actions can't do — mounting Better Auth and serving images.

Everything lives under `src/`:

- **`src/app`** — routes. `(auth)/login` and `(auth)/register` are public; `feed` is the protected home screen (redirects to `/login` when signed out). The feed keeps its data and UI together: `queries.ts` reads (paginated feed, comments, replies, likers), `actions.ts` writes (create post/comment/reply, toggle likes), and `feed-data.ts` holds static design data (stories, suggestions). API routes live in `api/` (`api/auth/[...all]`, post/upload image handling).
- **`src/db`** — Drizzle schema, split into `auth.ts` (Better Auth tables) and `social.ts` (posts, comments, likes, uploads). See [Data model](#data-model).
- **`src/lib`** — shared logic, one concern per file: auth (`auth.ts`/`auth-client.ts`), rate limiting (`redis.ts`/`rate-limit.ts`), image uploads (`r2.ts`/`image-upload.ts`/`image-dimensions.ts`), validation (`validation.ts`, Zod), email, and small helpers. Keeping it here keeps the routes and Actions thin.
- **`src/components`** — UI shared across routes (currently `avatar.tsx`).

Other top-level dirs: `drizzle` (generated migrations), `public` (bundled design assets/styles), `scripts`, and `tests`.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then fill in the values below
pnpm db:push                 # apply the schema to your database
pnpm dev                     # http://localhost:3000
```

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string (Neon). |
| `BETTER_AUTH_SECRET` | Yes | Secret used to sign sessions/cookies. |
| `BETTER_AUTH_URL` | Yes | Base URL of the app (e.g. `http://localhost:3000`). |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST URL. Backs all rate limiting and Better Auth's secondary storage. |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis REST token. |
| `R2_ACCOUNT_ID` | No | Cloudflare R2 account ID. Image uploads are disabled without R2; text-only posts still work. |
| `R2_ACCESS_KEY_ID` | No | R2 access key ID. |
| `R2_SECRET_ACCESS_KEY` | No | R2 secret access key. |
| `R2_BUCKET` | No | R2 bucket name. Keep it private — images are served through an authorized app route. |
| `R2_ALLOWED_ORIGINS` | No | Comma-separated browser origins allowed to request upload URLs (e.g. `http://localhost:3000`). |

## Why Better Auth

Authentication is easy to get subtly wrong and expensive to get wrong in production, so Buddy Script delegates it to [Better Auth](https://www.better-auth.com/) rather than hand-rolling sessions, password hashing, and token flows. Better Auth is a self-hosted library (not a third-party service), so we keep full control of our data — sessions and accounts live in our own Postgres via the Drizzle adapter — while offloading the security-critical plumbing. Concretely, it gives us:

- **Battle-tested credential handling.** Password hashing, session creation, and cookie management are handled and reviewed by the library, not bespoke code we'd have to audit.
- **Secure session management.** HTTP-only, signed cookies with a short-lived cookie cache (`session.cookieCache`) cut DB round-trips without weakening sessions.
- **Built-in account flows.** Email verification and password reset (with session revocation) work out of the box.
- **Defense-in-depth rate limiting.** Per-path limits (e.g. sign-in/sign-up 3/10s) keyed by IP, backed by Upstash Redis so they hold across instances. Complements the app's own [limiter](#rate-limits).
- **Origin/CSRF protection.** Request-origin validation (`trustedOrigins`) guards state-changing endpoints.
- **Extensibility without forking.** `additionalFields`, `before` hooks for Zod validation, and plugins (`nextCookies`) let us extend behavior while the core stays maintained upstream.

In short: rolling our own would mean owning and maintaining the riskiest part of the stack. Better Auth lets us keep our data in our database while standing on a maintained, security-focused foundation.

## Data model

Schema lives in `src/db` (`auth.ts` for authentication, `social.ts` for the feed).

**Authentication (Better Auth):** `user`, `session`, `account`, and `verification`. A user owns many sessions and accounts.

**Feed (social):**

- **posts** — authored by a user; optional image (stored in R2, referenced by object key) plus denormalized `like_count` and `comment_count`. Soft-deleted via `deleted_at`, and can be marked private.
- **comments** — belong to a post and an author, with a self-reference (`parent_id`) for one level of threaded replies. Soft-deleted via `deleted_at`.
- **post_likes / comment_likes** — join tables with a composite primary key, so a user can like a given post or comment only once.
- **image_uploads** — tracks the lifecycle of a presigned R2 upload (`pending → processing → attached`/`rejected`) and links the published object to its post.

## Seed data

The database is seeded with several months of activity (posts dated August 2025 – June 2026) to exercise pagination and the denormalized counters at realistic scale:

| Entity | Count |
| --- | --- |
| Users | ~2,000 |
| Posts | ~335,000 (≈17,000 private) |
| Comments | ~335,000 |
| Replies | ~84,000 |
| Post likes | ~671,000 |
| Comment likes | ~126,000 |

> [!NOTE]
> The demo runs on Neon's free tier, which caps a branch at **512 MiB** of logical storage. That ceiling is why the dataset tops out in the hundreds of thousands rather than millions of posts — seeding millions would blow past the free-tier limit. The scale here is already enough to exercise pagination and the denormalized counters realistically.

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

## Not implemented (production roadmap)

Buddy Script focuses on the core product. The following are intentionally out of scope for this build and would be addressed before a real production launch:

- **Error tracking** — wire up [Sentry](https://sentry.io/) (or similar) to capture unhandled exceptions and Server Action failures with source maps and release tracking.
- **Logging & monitoring** — structured application logs, request tracing, uptime checks, and dashboards/alerting (e.g. OpenTelemetry, a log aggregator, and metrics on latency/error rates).
- **Real-time feed updates** — the feed currently loads newest-first and paginates on demand; live updates (new posts, likes, and comments pushed without a refresh via WebSockets/SSE) are a future TODO.
- **Production email verification** — wire up a real transactional email provider and enforce verified emails before feed access (the Better Auth flows exist; production needs deliverable email + enforcement).
- **Automated testing** — broader unit, integration, and end-to-end coverage, with a TDD workflow so new features ship with tests gating the existing GitHub + Vercel deploy pipeline.
- **Observability for the queue/uploads** — alerting on stuck `image_uploads` (e.g. `pending`/`processing` rows that never reach `attached`).

## Scaling opportunities

The app already makes a few choices that help it scale — it renders on the server, loads the feed in pages instead of all at once, keeps a running `like_count`/`comment_count` on each post so it doesn't have to count every time, and rate-limits through Redis so the limits work even with many servers. Here's what we'd do next as traffic grows:

- **Cache the feed.** The first page of the feed looks the same for most users, so we can save it (in Redis or Next.js's built-in cache) and serve that copy instead of asking the database every time. We'd refresh it when new posts come in. This makes the most common page much faster.
- **Use a message broker for background work.** Some work is slow and doesn't need to happen while the user waits — verifying and publishing uploaded images, sending emails, sending notifications. Put these on a queue (like SQS or QStash) and let background workers handle them, so the user gets an instant response and failed jobs retry automatically.
- **Event-driven architecture.** Instead of one action doing everything at once, each action would just announce what happened (`PostCreated`, `PostLiked`, `CommentAdded`). Other parts of the system listen for these events and react — updating caches, sending notifications, recording analytics. This keeps writes fast and makes it easy to add new behavior later without touching the existing code.
- **Database read replicas.** A social feed does far more reading than writing. We can keep extra read-only copies of the database and send feed/comment reads to those, while writes still go to the main database.
- **Split big tables across servers (sharding).** When tables like `posts`, `comments`, and the like tables get too big for one database, we can split them across several — for example by user or post ID — so the load and storage spread out.
- **Faster like/comment counters.** On a very popular post, lots of people liking at once can fight over the same row. We can count likes in Redis first and save the total to the database every so often, instead of writing to the row on every single like.
