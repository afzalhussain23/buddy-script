export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

type PresignedUpload = {
  uploadId: string;
  uploadUrl: string;
  headers: { "Content-Type": AllowedImageType };
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
    | { error?: string };

  if (!signingResponse.ok || !("uploadUrl" in signingBody)) {
    const message = "error" in signingBody ? signingBody.error : undefined;
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
