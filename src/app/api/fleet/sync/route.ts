/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LEGACY whole-state fleet sync. Deprecated → /api/sync/push|pull|replay.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getFleetState, updateFleetState } from "@/lib/fleetStore";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Fleet-Sync-Secret",
  Deprecation: "true",
  Sunset: "Sat, 01 Nov 2026 00:00:00 GMT",
  Link: '</api/sync/push>; rel="successor-version"',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export const GET = withApiHandler(async () => {
  const state = await getFleetState();
  return ok(state, { headers: CORS_HEADERS });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const requireSecret = process.env.FLEET_SYNC_REQUIRE_SECRET === "true";
  const secret = process.env.FLEET_SYNC_SECRET;
  if (requireSecret && secret) {
    const provided =
      request.headers.get("x-fleet-sync-secret") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (provided !== secret) {
      throw AppError.unauthenticated();
    }
  }

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
