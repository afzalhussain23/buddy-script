import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { uuidv7 } from "uuidv7";
import { db } from "@/db";
import { imageUploads } from "@/db/social";
import { auth } from "@/lib/auth";
import {
  ALLOWED_IMAGE_TYPES,
  type AllowedImageType,
  MAX_IMAGE_UPLOAD_BYTES,
} from "@/lib/image-upload";
import {
  createPresignedImageUpload,
  PENDING_UPLOAD_TTL_MS,
  R2ConfigurationError,
} from "@/lib/r2";
import { consumeRateLimit } from "@/lib/rate-limit";

const UPLOAD_LIMIT = 10;
const UPLOAD_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const configured = [
    process.env.BETTER_AUTH_URL,
    ...(process.env.R2_ALLOWED_ORIGINS?.split(",") ?? []),
  ];

  return configured.some((value) => {
    if (!value?.trim()) return false;
    try {
      return new URL(value.trim()).origin === origin;
    } catch {
      return false;
    }
  });
}

function isAllowedImageType(value: unknown): value is AllowedImageType {
  return (
    typeof value === "string" &&
    ALLOWED_IMAGE_TYPES.some((type) => type === value)
  );
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { error: "Origin is not allowed." },
      { status: 403 },
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const contentType =
    typeof body === "object" && body !== null && "contentType" in body
      ? body.contentType
      : undefined;
  const size =
    typeof body === "object" && body !== null && "size" in body
      ? body.size
      : undefined;

  if (!isAllowedImageType(contentType)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, and GIF images are allowed." },
      { status: 400 },
    );
  }
  if (
    typeof size !== "number" ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > MAX_IMAGE_UPLOAD_BYTES
  ) {
    return NextResponse.json(
      { error: "Image must be between 1 byte and 5 MB." },
      { status: 400 },
    );
  }

  const rateLimit = await consumeRateLimit({
    action: "image-upload",
    identifier: session.user.id,
    limit: UPLOAD_LIMIT,
    windowMs: UPLOAD_LIMIT_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many image uploads. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  try {
    const uploadId = uuidv7();
    const upload = await createPresignedImageUpload({
      uploadId,
      contentType,
      size,
    });
    await db.insert(imageUploads).values({
      id: uploadId,
      userId: session.user.id,
      pendingObjectKey: upload.pendingObjectKey,
      publishedObjectKey: upload.publishedObjectKey,
      publicUrl: upload.publicUrl,
      contentType,
      expectedSize: size,
      expiresAt: new Date(Date.now() + PENDING_UPLOAD_TTL_MS),
    });

    return NextResponse.json({
      uploadId,
      uploadUrl: upload.uploadUrl,
      headers: upload.headers,
    });
  } catch (error) {
    if (error instanceof R2ConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Failed to create R2 presigned upload", error);
    return NextResponse.json(
      { error: "Could not prepare image upload." },
      { status: 500 },
    );
  }
}
