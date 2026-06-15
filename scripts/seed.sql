-- Dummy-data seed for Buddy Script.
--
-- Scaled to fit Neon's free-tier 512 MB branch limit (target ~400 MB):
--   ~2k authors, 400k posts, ~400k comments + 100k replies,
--   ~800k post-likes, 150k comment-likes.
--
-- Strategy: all generation happens in-database via generate_series + INSERT…SELECT
-- (no app/ORM round-trips). Denormalized counters (posts.like_count,
-- posts.comment_count, comments.like_count) are backfilled at the end so they
-- match the app's own increment logic. Re-runnable: it deletes prior seed rows first.
--
-- Run:  psql "$DATABASE_URL" -f scripts/seed.sql
-- Tweak volumes with the \set lines below.

\set ON_ERROR_STOP on
\timing on

\set authors 2000
\set posts 400000
\set replies 100000
\set commentlikes 150000

-- Note: ids for posts/comments use gen_random_uuid() (v4) rather than the app's
-- uuidv7 — the app generates uuidv7 in JS ($defaultFn), so there is no DB-side
-- default. The feed orders by created_at (not id), so v4 ids sort correctly; the
-- schema comments explicitly anticipate seeded v4 UUIDs.

begin;

-- ---------------------------------------------------------------------------
-- 0. Clean up any previous seed run (idempotent). Deleting seed posts cascades
--    to their comments + post_likes; deleting comments cascades to comment_likes.
--    Seed rows are tagged by id prefix / body prefix.
-- ---------------------------------------------------------------------------
delete from posts where body like 'Seed %';
delete from "user" where id like 'seed_user_%';

-- ---------------------------------------------------------------------------
-- 1. Authors. Plain user rows (no account rows → can't log in, which is fine for
--    seed authors; the real test@buddyscript.dev login is untouched).
-- ---------------------------------------------------------------------------
insert into "user" (id, name, first_name, last_name, email, email_verified, image, created_at, updated_at)
select
  'seed_user_' || g,
  'User ' || g,
  'First' || g,
  'Last' || g,
  'seed_user_' || g || '@example.com',
  true,
  null,
  now() - (random() * interval '500 days'),
  now()
from generate_series(1, :authors) g;

-- ---------------------------------------------------------------------------
-- 2. Posts. created_at spread over the last year so the feed has realistic
--    ordering; ~5% private; image_url left null (the partial-unique image index
--    requires uniqueness, and these are text-only). Counters seeded 0, fixed in §6.
-- ---------------------------------------------------------------------------
insert into posts (id, author_id, body, image_url, is_private, like_count, comment_count, created_at)
select
  gen_random_uuid(),
  'seed_user_' || (1 + floor(random() * :authors))::int,
  'Seed post ' || g || ' — ' || (array[
    'just shipped something small today',
    'gm everyone',
    'thinking about postgres indexes again',
    'hot take: keyset pagination beats offset',
    'coffee then code',
    'anyone else love a clean migration?',
    'weekend project incoming',
    'debugging is just applied curiosity'
  ])[1 + floor(random() * 8)],
  null,
  random() < 0.05,
  0,
  0,
  now() - (random() * interval '365 days')
from generate_series(1, :posts) g;

-- ---------------------------------------------------------------------------
-- 3. Top-level comments: 0–2 per post (avg ~1). Timestamp after the post.
-- ---------------------------------------------------------------------------
insert into comments (id, post_id, author_id, parent_id, body, like_count, created_at)
select
  gen_random_uuid(),
  p.id,
  'seed_user_' || (1 + floor(random() * :authors))::int,
  null,
  'Seed comment — ' || (array[
    'nice one', 'agreed', 'tell me more', 'this is the way',
    'lol', 'underrated take', 'saving this', 'same here'
  ])[1 + floor(random() * 8)],
  0,
  p.created_at + random() * (now() - p.created_at)
from posts p
cross join lateral generate_series(
  1,
  (floor(random() * 3))::int + 0 * length(p.id::text)
) cs
where p.body like 'Seed %';

-- ---------------------------------------------------------------------------
-- 4. Replies: one level deep, parent is a random existing top-level seed comment
--    (same post_id, as the schema's self-FK requires conceptually).
-- ---------------------------------------------------------------------------
insert into comments (id, post_id, author_id, parent_id, body, like_count, created_at)
select
  gen_random_uuid(),
  c.post_id,
  'seed_user_' || (1 + floor(random() * :authors))::int,
  c.id,
  'Seed reply — ' || (array[
    'good point', 'exactly', 'haha', 'not sure i agree',
    'source?', '100%', 'well put', 'this'
  ])[1 + floor(random() * 8)],
  0,
  c.created_at + random() * (now() - c.created_at)
from (
  select id, post_id, created_at
  from comments
  where parent_id is null and body like 'Seed comment%'
  order by random()
  limit :replies
) c;

-- ---------------------------------------------------------------------------
-- 5. Likes. on conflict do nothing absorbs duplicate (user, target) pairs from
--    the random generation and makes re-runs safe.
-- ---------------------------------------------------------------------------
insert into post_likes (user_id, post_id, created_at)
select
  'seed_user_' || (1 + floor(random() * :authors))::int,
  p.id,
  now() - random() * interval '300 days'
from posts p
cross join lateral generate_series(
  1,
  (floor(random() * 5))::int + 0 * length(p.id::text)
) cs   -- 0–4 per post, avg 2
where p.body like 'Seed %'
on conflict do nothing;

insert into comment_likes (user_id, comment_id, created_at)
select
  'seed_user_' || (1 + floor(random() * :authors))::int,
  c.id,
  now() - random() * interval '200 days'
from (
  select id from comments where body like 'Seed %' order by random() limit :commentlikes
) c
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 6. Backfill denormalized counters to match the app's increment logic:
--    comment_count = all live comments (top-level + replies) on the post.
-- ---------------------------------------------------------------------------
update posts p set comment_count = sub.c
from (
  select post_id, count(*) c from comments where deleted_at is null group by post_id
) sub
where p.id = sub.post_id and p.body like 'Seed %';

update posts p set like_count = sub.c
from (
  select post_id, count(*) c from post_likes group by post_id
) sub
where p.id = sub.post_id and p.body like 'Seed %';

update comments cm set like_count = sub.c
from (
  select comment_id, count(*) c from comment_likes group by comment_id
) sub
where cm.id = sub.comment_id and cm.body like 'Seed %';

commit;

-- Refresh planner stats after the bulk load.
analyze "user";
analyze posts;
analyze comments;
analyze post_likes;
analyze comment_likes;

-- Quick summary.
select
  (select count(*) from posts          where body like 'Seed %') as seed_posts,
  (select count(*) from comments       where body like 'Seed %') as seed_comments,
  (select count(*) from post_likes)                              as post_likes,
  (select count(*) from comment_likes)                           as comment_likes,
  pg_size_pretty(pg_database_size(current_database()))           as db_size;
