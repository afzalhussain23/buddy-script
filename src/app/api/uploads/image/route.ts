import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { uuidv7 } from "uuidv7";
import { db } from "@/db";
import { imageUploads } from "@/db/social";
import { auth } from "@/lib/auth";
import { imageUploadRequestSchema } from "@/lib/image-upload";
import {
  createPresignedImageUpload,
  PENDING_UPLOAD_TTL_MS,
  R2ConfigurationError,
} from "@/lib/r2";
import { consumeRateLimit } from "@/lib/rate-limit";
import { limitRequestBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { getFieldErrors, getValidationMessage } from "@/lib/validation";

const UPLOAD_LIMIT = 10;
const UPLOAD_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_METADATA_BODY_BYTES = 16 * 1024;

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
    body = await (
      await limitRequestBody(request, MAX_METADATA_BODY_BYTES)
    ).json();
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { error: "Upload metadata is too large." },
        { status: 413 },
      );
    }
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = imageUploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = getValidationMessage(
      parsed.error,
      "Invalid upload metadata.",
    );
    return NextResponse.json(
      { error: message, message, fieldErrors: getFieldErrors(parsed.error) },
      { status: 400 },
    );
  }
  const { contentType, size } = parsed.data;

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
