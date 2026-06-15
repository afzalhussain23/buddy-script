import { z } from "zod";

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

// Bounds for stored post-image dimensions. Single source of truth shared by the
// server-side upload verification (src/lib/r2.ts) and the DB CHECK constraint
// (src/db/social.ts) so the two can never drift.
export const MAX_IMAGE_DIMENSION = 16_384;
export const MAX_IMAGE_PIXELS = 40_000_000;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const imageUploadRequestSchema = z.strictObject({
  contentType: z.enum(ALLOWED_IMAGE_TYPES, {
    message: "Only JPEG, PNG, WebP, and GIF images are allowed.",
  }),
  size: z
    .number({ message: "Image size must be a number." })
    .int("Image size must be a whole number of bytes.")
    .min(1, "Image must not be empty.")
    .max(MAX_IMAGE_UPLOAD_BYTES, "Image must be 5 MB or smaller."),
});

type PresignedUpload = {
  uploadId: string;
  uploadUrl: string;
  headers: { "Content-Type": AllowedImageType };
};

type UploadError = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

function isAllowedImageType(value: string): value is AllowedImageType {
  return ALLOWED_IMAGE_TYPES.some((type) => type === value);
}

export async function uploadImageToR2(file: File): Promise<string> {
  if (!isAllowedImageType(file.type)) {
    throw new Error("Choose a JPEG, PNG, WebP, or GIF image.");
  }
  if (file.size < 1 || file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("Image must be between 1 byte and 5 MB.");
  }

  const signingResponse = await fetch("/api/uploads/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type, size: file.size }),
  });
  const signingBody = (await signingResponse.json()) as
    | PresignedUpload
    | UploadError;

  if (!signingResponse.ok || !("uploadUrl" in signingBody)) {
    const message =
      "error" in signingBody
        ? (signingBody.fieldErrors?.contentType?.[0] ??
          signingBody.fieldErrors?.size?.[0] ??
          signingBody.message ??
          signingBody.error)
        : undefined;
    throw new Error(message ?? "Could not prepare image upload.");
  }

  const uploadResponse = await fetch(signingBody.uploadUrl, {
    method: "PUT",
    headers: signingBody.headers,
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Image upload failed. Please try again.");
  }

  return signingBody.uploadId;
}
