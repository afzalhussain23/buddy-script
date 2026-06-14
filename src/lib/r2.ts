import "server-only";

import { randomUUID } from "node:crypto";
import type { HeadObjectCommandOutput } from "@aws-sdk/client-s3";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AllowedImageType } from "./image-upload";

const EXTENSIONS: Record<AllowedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const PRESIGNED_URL_TTL_SECONDS = 5 * 60;
export const PENDING_UPLOAD_TTL_MS = 60 * 60 * 1000;

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

export class R2ConfigurationError extends Error {
  constructor() {
    super("Image uploads are unavailable because R2 is not configured.");
    this.name = "R2ConfigurationError";
  }
}

export class R2UploadVerificationError extends Error {
  constructor(message = "The uploaded image could not be verified.") {
    super(message);
    this.name = "R2UploadVerificationError";
  }
}

function getR2Config(): R2Config {
  const config = {
    accountId: process.env.R2_ACCOUNT_ID?.trim(),
    accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim(),
    bucket: process.env.R2_BUCKET?.trim(),
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, ""),
  };

  if (Object.values(config).some((value) => !value)) {
    throw new R2ConfigurationError();
  }

  return config as R2Config;
}

export function getPublicObjectUrl(baseUrl: string, key: string): string {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${baseUrl}/${encodedKey}`;
}

export async function createPresignedImageUpload({
  uploadId,
  contentType,
  size,
}: {
  uploadId: string;
  contentType: AllowedImageType;
  size: number;
}) {
  const config = getR2Config();
  const objectId = randomUUID();
  const extension = EXTENSIONS[contentType];
  const pendingObjectKey = `pending/${uploadId}/${objectId}.${extension}`;
  const publishedObjectKey = `posts/${objectId}.${extension}`;
  const client = getR2Client(config);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: pendingObjectKey,
    ContentType: contentType,
    ContentLength: size,
  });

  return {
    uploadUrl: await getSignedUrl(client, command, {
      expiresIn: PRESIGNED_URL_TTL_SECONDS,
    }),
    pendingObjectKey,
    publishedObjectKey,
    publicUrl: getPublicObjectUrl(config.publicBaseUrl, publishedObjectKey),
    headers: { "Content-Type": contentType },
  };
}

function getR2Client(config = getR2Config()) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function verifyAndPublishImageUpload(upload: {
  pendingObjectKey: string;
  publishedObjectKey: string;
  contentType: string;
  expectedSize: number;
}): Promise<void> {
  const config = getR2Config();
  const client = getR2Client(config);
  let object: HeadObjectCommandOutput;

  try {
    object = await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: upload.pendingObjectKey,
      }),
    );
  } catch {
    throw new R2UploadVerificationError("The image upload was not found.");
  }

  if (
    object.ContentLength !== upload.expectedSize ||
    object.ContentType !== upload.contentType
  ) {
    await deleteR2Object(upload.pendingObjectKey).catch(() => undefined);
    throw new R2UploadVerificationError(
      "The uploaded image does not match the requested type or size.",
    );
  }

  const content = await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: upload.pendingObjectKey,
      Range: "bytes=0-15",
    }),
  );
  const signature = await content.Body?.transformToByteArray();
  if (!signature || !matchesImageSignature(signature, upload.contentType)) {
    await deleteR2Object(upload.pendingObjectKey).catch(() => undefined);
    throw new R2UploadVerificationError(
      "The uploaded file content is not a valid supported image.",
    );
  }

  await client.send(
    new CopyObjectCommand({
      Bucket: config.bucket,
      CopySource: `${config.bucket}/${upload.pendingObjectKey}`,
      Key: upload.publishedObjectKey,
      ContentType: upload.contentType,
      MetadataDirective: "REPLACE",
    }),
  );
}

function matchesImageSignature(
  bytes: Uint8Array,
  contentType: string,
): boolean {
  const startsWith = (...signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);

  switch (contentType) {
    case "image/jpeg":
      return startsWith(0xff, 0xd8, 0xff);
    case "image/png":
      return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/gif":
      return (
        startsWith(0x47, 0x49, 0x46, 0x38, 0x37, 0x61) ||
        startsWith(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)
      );
    case "image/webp":
      return (
        startsWith(0x52, 0x49, 0x46, 0x46) &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      );
    default:
      return false;
  }
}

export async function deleteR2Object(key: string): Promise<void> {
  const config = getR2Config();
  await getR2Client(config).send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
}
