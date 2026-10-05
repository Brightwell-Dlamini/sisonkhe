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

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSupabaseSession(request);
  const { pathname } = request.nextUrl;

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
