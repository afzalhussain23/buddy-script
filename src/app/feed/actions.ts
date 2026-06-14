"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { type FeedCursor, type FeedPage, getFeedPage } from "./queries";

export async function loadMorePosts(cursor: FeedCursor): Promise<FeedPage> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { posts: [], nextCursor: null };
  }
  return getFeedPage(session.user.id, cursor);
}
