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
  "/api/auth/claim",
  "/api/auth/signin",
  "/api/register",
  "/api/assignments",
  "/api/health",
  "/api/fleet/status",
  "/api/public",
  "/api/qr/verify",
  "/api/payments/webhooks",
];

const AUTH_ROUTES = ["/login", "/claim", "/register"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSupabaseSession(request);
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isPublic) {
    if (user && AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
      // let login page handle redirect by role
    }
    return response;
  }

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
