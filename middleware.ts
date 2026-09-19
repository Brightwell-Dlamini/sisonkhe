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
  "/kiosk",
  "/api/auth/claim",
  "/api/auth/signin",
  "/api/health",
  "/api/fleet/status",
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

  // If authenticated user hits login/claim, push them home
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If unauthenticated user hits protected route, push them to login
  if (!isPublic && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     *   - _next/static (static files)
     *   - _next/image (image optimization)
     *   - favicon.ico
     *   - Public asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
