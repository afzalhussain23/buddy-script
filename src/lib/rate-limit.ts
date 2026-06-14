import "server-only";

import { lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimitBuckets } from "@/db/social";

export async function consumeRateLimit({
  action,
  identifier,
  limit,
  windowMs,
}: {
  action: string;
  identifier: string;
  limit: number;
  windowMs: number;
}): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const bucketStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = new Date(bucketStart + windowMs);
  const key = `${action}:${identifier}:${bucketStart}`;

  await db
    .delete(rateLimitBuckets)
    .where(lt(rateLimitBuckets.expiresAt, new Date(now)));

  const [bucket] = await db
    .insert(rateLimitBuckets)
    .values({ key, expiresAt })
    .onConflictDoUpdate({
      target: rateLimitBuckets.key,
      set: { count: sql`${rateLimitBuckets.count} + 1` },
    })
    .returning({ count: rateLimitBuckets.count });

  return {
    allowed: (bucket?.count ?? limit + 1) <= limit,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((expiresAt.getTime() - now) / 1000),
    ),
  };
}
