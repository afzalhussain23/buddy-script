import { and, eq, isNotNull, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { posts } from "@/db/social";
import { auth } from "@/lib/auth";
import {
  getR2Object,
  R2ConfigurationError,
  R2ObjectNotFoundError,
} from "@/lib/r2";

const postIdSchema = z.uuid();

export async function GET(
  request: Request,
  context: { params: Promise<{ postId: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const parsedPostId = postIdSchema.safeParse((await context.params).postId);
  if (!parsedPostId.success) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  const [post] = await db
    .select({ imageObjectKey: posts.imageObjectKey })
    .from(posts)
    .where(
      and(
        eq(posts.id, parsedPostId.data),
        isNull(posts.deletedAt),
        isNotNull(posts.imageObjectKey),
        or(eq(posts.isPrivate, false), eq(posts.authorId, session.user.id)),
      ),
    )
    .limit(1);

  if (!post?.imageObjectKey) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  try {
    const object = await getR2Object(post.imageObjectKey);
    return new Response(object.body, {
      headers: {
        "Cache-Control": "private, max-age=300",
        ...(object.contentLength === undefined
          ? {}
          : { "Content-Length": String(object.contentLength) }),
        "Content-Type": object.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof R2ConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof R2ObjectNotFoundError) {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }
    console.error("Failed to load authorized post image", error);
    return NextResponse.json(
      { error: "Image service is temporarily unavailable." },
      { status: 502 },
    );
  }
}
