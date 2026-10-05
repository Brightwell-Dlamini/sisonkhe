/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Next.js middleware.
 *
 * Responsibilities:
 *   1. Refresh Supabase session on every request
 *   2. Redirect unauthenticated users away from protected routes
 *   3. Redirect authenticated users away from /login and /claim
 *   4. Never interfere with PWA plumbing (sw.js, manifest, offline page)
 */

import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "./src/lib/supabase/middleware";

/** Routes reachable without a session. Everything else requires auth. */
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/claim",
  "/register",
  "/kiosk",
  "/verify",
  "/departures",
  "/offline",
  "/api/auth/claim",
  "/api/auth/signin",
  "/api/register",
  "/api/assignments",
  "/api/health",
  "/api/fleet/status",
  "/api/public",
  "/api/qr/verify",
  // Webhooks must remain public (provider signatures verify authenticity)
  "/api/payments/webhooks",
];

const AUTH_ROUTES = ["/login", "/claim"];

/** Paths the middleware must never touch (PWA plumbing). */
const PWA_BYPASS = new Set([
  "/sw.js",
  "/manifest.webmanifest",
  "/offline",
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // PWA plumbing is served directly, no auth, no session refresh.
  if (PWA_BYPASS.has(pathname)) {
    return NextResponse.next();
  }

  const { response, user } = await updateSupabaseSession(request);

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isPublic && !user) {
    // API routes: return 401 JSON instead of HTML login redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff2?|ttf|webmanifest|json|txt)$).*)",
  ],
};
