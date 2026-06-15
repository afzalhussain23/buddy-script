import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { limitRequestBody, RequestBodyTooLargeError } from "@/lib/request-body";

const AUTH_BODY_LIMIT_BYTES = 64 * 1024;
const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

export async function POST(request: Request) {
  try {
    return handlers.POST(
      await limitRequestBody(request, AUTH_BODY_LIMIT_BYTES),
    );
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { error: "Authentication request is too large." },
        { status: 413 },
      );
    }
    throw error;
  }
}
