/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Edge middleware. Two jobs:
 *   1. Refresh Supabase session cookies
 *   2. Enforce ROLE ↔ PATH ownership at the edge (JWT-backed, DB-free)
 *
 * Path ownership is derived from the table below, which mirrors
 * homeRouteForRole() in src/lib/navigation/resolve.ts. If you add a role
 * or change a home route, update BOTH.
 */

import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "./src/lib/supabase/middleware";
import type { AuthRole } from "./src/lib/auth/roles";

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
const PWA_BYPASS = new Set(["/sw.js", "/manifest.webmanifest", "/offline"]);

/**
 * Path prefix → allowed roles. FIRST matching prefix wins.
 * Keep in lockstep with homeRouteForRole().
 */
const ROLE_GATES: Array<{ prefix: string; roles: readonly AuthRole[] }> = [
  { prefix: "/admin/super", roles: ["super-admin"] },
  { prefix: "/admin",       roles: ["super-admin", "admin", "fleet-manager"] },
  { prefix: "/super",       roles: ["super-admin"] },
  { prefix: "/marshal",     roles: ["marshal"] },
  { prefix: "/driver",      roles: ["driver"] },
  { prefix: "/operator",    roles: ["operator"] },
  { prefix: "/inspector",   roles: ["inspector"] },
];

function gateForPath(pathname: string): readonly AuthRole[] | null {
  for (const { prefix, roles } of ROLE_GATES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return roles;
    }
  }
  return null;
}

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
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Edge role gate for page routes. Reads role from app_metadata.role.
  // If the claim is missing, we defer to the server page (which uses the
  // hardened getServerSession()). This keeps the edge DB-free.
  const gate = gateForPath(pathname);
  if (gate && user) {
    const meta = user.app_metadata as Record<string, unknown> | null;
    const roleFromToken = meta?.role;

    if (typeof roleFromToken === "string" && !gate.includes(roleFromToken as AuthRole)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff2?|ttf|webmanifest|json|txt)$).*)",
  ],
};
