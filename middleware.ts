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
  "/api/payments/webhooks",
  // Event-sync endpoints require auth in production; temporarily public for migration
  // Tighten once clients send session cookies reliably.
  "/api/sync/watermark",
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

  // Authenticated user hitting login/claim → home
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Unauthenticated user on protected route → login
  if (!isPublic && !user) {
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
