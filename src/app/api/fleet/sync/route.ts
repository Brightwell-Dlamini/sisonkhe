/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LEGACY whole-state fleet sync. Deprecated → /api/sync/push|pull|replay.
 *
 * Auth:
 * - POST always requires FLEET_SYNC_SECRET when FLEET_SYNC_REQUIRE_SECRET=true
 *   (fail closed if secret is missing).
 * - GET requires the same secret, or an authenticated staff session.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getFleetState, updateFleetState } from "@/lib/fleetStore";
import { getServerSession } from "@/lib/auth/session";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "same-origin",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Fleet-Sync-Secret",
  Deprecation: "true",
  Sunset: "Sat, 01 Nov 2026 00:00:00 GMT",
  Link: '</api/sync/push>; rel="successor-version"',
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function providedSecret(request: NextRequest): string {
  return (
    request.headers.get("x-fleet-sync-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  );
}

/** Fail closed when secret is required. */
function assertFleetSecret(request: NextRequest): void {
  const requireSecret = process.env.FLEET_SYNC_REQUIRE_SECRET !== "false";
  if (!requireSecret) return;

  const secret = process.env.FLEET_SYNC_SECRET;
  if (!secret || secret.length < 16) {
    throw AppError.internal(
      "FLEET_SYNC_SECRET is required when FLEET_SYNC_REQUIRE_SECRET is enabled"
    );
  }
  const provided = providedSecret(request);
  if (!provided || !timingSafeEqual(provided, secret)) {
    throw AppError.unauthenticated();
  }
}

async function assertFleetReadAccess(request: NextRequest): Promise<void> {
  const secret = process.env.FLEET_SYNC_SECRET;
  const provided = providedSecret(request);
  if (secret && secret.length >= 16 && provided && timingSafeEqual(provided, secret)) {
    return;
  }

  const session = await getServerSession();
  if (
    session &&
    (session.role === "super-admin" ||
      session.role === "admin" ||
      session.role === "fleet-manager")
  ) {
    return;
  }

  // Default: require secret when configured for read as well
  assertFleetSecret(request);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export const GET = withApiHandler(async (request: NextRequest) => {
  await assertFleetReadAccess(request);
  const state = await getFleetState();
  return ok(state, { headers: CORS_HEADERS });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  assertFleetSecret(request);

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > 5 * 1024 * 1024) {
    throw AppError.validation("Payload too large");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw AppError.validation("Invalid JSON body");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw AppError.validation("Body must be a JSON object");
  }

  const newState = await updateFleetState(body as Record<string, unknown>);

  if (process.env.FLEET_API_DEBUG === "true") {
    console.log(
      "[fleet/sync] POST updated (LEGACY), lastUpdated=",
      newState.lastUpdated
    );
  }

  return ok(
    {
      success: true,
      lastUpdated: newState.lastUpdated,
      deprecation:
        "This endpoint is deprecated. Migrate to /api/sync/push (event-log protocol).",
    },
    { headers: CORS_HEADERS }
  );
});
