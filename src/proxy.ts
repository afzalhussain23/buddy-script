import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Pages a signed-out user is allowed to reach. Everything else is protected.
const AUTH_ROUTES = new Set(["/login", "/register"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Auth screens: bounce signed-in users to the feed, let everyone else through.
  if (AUTH_ROUTES.has(pathname)) {
    if (session) {
      return NextResponse.redirect(new URL("/feed", request.url));
    }
    return NextResponse.next();
  }

  // Every other matched route requires a session.
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Landing route: send signed-in users to their feed.
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route except API routes, Next.js internals, and static files
  // (anything with a file extension). This protects all current and future
  // pages by default; AUTH_ROUTES above are the only public ones.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
