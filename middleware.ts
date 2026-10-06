/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "./src/lib/supabase/middleware";

/**
 * Truly public routes. Assignment is NOT listed — public self-link must use
 * /api/public/assignments (national-id only, rate-limited) if needed.
 */
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
  "/api/public",
  "/api/health",
  "/api/fleet/status",
  "/api/qr/verify",
  "/api/payments/webhooks",
];

const AUTH_ROUTES = ["/login", "/claim"];

const PWA_BYPASS = new Set([
  "/sw.js",
  "/manifest.webmanifest",
  "/offline",
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
