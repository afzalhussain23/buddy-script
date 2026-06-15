import assert from "node:assert/strict";
import test from "node:test";
import { imageUploadRequestSchema } from "../src/lib/image-upload.ts";
import {
  limitRequestBody,
  RequestBodyTooLargeError,
} from "../src/lib/request-body.ts";
import {
  createPostSchema,
  feedCursorSchema,
  loadLikersSchema,
  signInEmailSchema,
  signUpEmailSchema,
  signUpSchema,
  togglePostLikeSchema,
} from "../src/lib/validation.ts";

const uuid = "019785e7-0f11-7000-8000-000000000001";

test("signup requires terms and caps user-controlled strings", () => {
  const base = {
    name: "",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    password: "correct-horse",
  };

  assert.equal(signUpSchema.safeParse(base).success, false);
  assert.equal(
    signUpSchema.safeParse({
      ...base,
      firstName: "x".repeat(101),
      acceptedTerms: true,
    }).success,
    false,
  );
});

test("strict schemas reject mass-assignment fields and arrays", () => {
  assert.equal(
    createPostSchema.safeParse({
      body: "hello",
      uploadId: null,
      isPrivate: true,
      role: "admin",
      credits: 999999,
    }).success,
    false,
  );
  assert.equal(createPostSchema.safeParse([]).success, false);
  assert.equal(
    createPostSchema.safeParse({ body: "hello", uploadId: null, items: [] })
      .success,
    false,
  );
});

test("email auth API schemas allow Better Auth route options only", () => {
  assert.equal(
    signInEmailSchema.safeParse({
      email: "ada@example.com",
      password: "correct-horse",
      callbackURL: "/feed",
      rememberMe: false,
    }).success,
    true,
  );
  assert.equal(
    signUpEmailSchema.safeParse({
      name: "Ignored Name",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      password: "correct-horse",
      acceptedTerms: true,
      image: "https://example.com/avatar.png",
      callbackURL: "/feed",
      rememberMe: false,
    }).success,
    true,
  );
  assert.equal(
    signUpEmailSchema.safeParse({
      name: "Ignored Name",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      password: "correct-horse",
      acceptedTerms: true,
      role: "admin",
    }).success,
    false,
  );
});

test("IDs, booleans, and cursor timestamps use exact types", () => {
  assert.equal(
    togglePostLikeSchema.safeParse({ postId: "not-a-uuid", liked: true })
      .success,
    false,
  );
  assert.equal(
    togglePostLikeSchema.safeParse({ postId: uuid, liked: "true" }).success,
    false,
  );
  assert.equal(
    feedCursorSchema.safeParse({ createdAt: "not-a-date", id: uuid }).success,
    false,
  );
});

test("liker cursor user IDs are bounded", () => {
  assert.equal(
    loadLikersSchema.safeParse({
      targetType: "post",
      targetId: uuid,
      cursor: {
        createdAt: "2026-06-15T00:00:00.000Z",
        userId: "x".repeat(256),
      },
    }).success,
    false,
  );
});

test("upload metadata rejects numeric strings, extra fields, and invalid MIME types", () => {
  assert.equal(
    imageUploadRequestSchema.safeParse({
      contentType: "image/png",
      size: "1024",
    }).success,
    false,
  );
  assert.equal(
    imageUploadRequestSchema.safeParse({
      contentType: "image/png",
      size: 1024,
      filename: "trusted.png",
    }).success,
    false,
  );
  assert.equal(
    imageUploadRequestSchema.safeParse({
      contentType: "text/plain",
      size: 1024,
    }).success,
    false,
  );
});

test("request body limit rejects oversized bodies without relying on Content-Length", async () => {
  const request = new Request("https://example.com/api", {
    method: "POST",
    body: "x".repeat(1025),
  });
  request.headers.delete("content-length");

  await assert.rejects(
    limitRequestBody(request, 1024),
    RequestBodyTooLargeError,
  );
});
