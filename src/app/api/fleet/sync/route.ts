/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LEGACY whole-state fleet sync.
 * Deprecated in favour of /api/sync/push | pull | replay.
 * Kept temporarily for older clients.
 */

import { NextRequest, NextResponse } from "next/server";
import { getFleetState, updateFleetState } from "@/lib/fleetStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Fleet-Sync-Secret",
  "Deprecation": "true",
  "Sunset": "Sat, 01 Nov 2026 00:00:00 GMT",
  "Link": '</api/sync/push>; rel="successor-version"',
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    const state = await getFleetState();
    return json(state);
  } catch (error) {
    console.error("[fleet/sync] GET error:", error);
    return json({ error: "Failed to load fleet state" }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const requireSecret = process.env.FLEET_SYNC_REQUIRE_SECRET === "true";
    const secret = process.env.FLEET_SYNC_SECRET;
    if (requireSecret && secret) {
      const provided =
        request.headers.get("x-fleet-sync-secret") ||
        request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      if (provided !== secret) {
        return json({ success: false, error: "Unauthorized" }, 401);
      }
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > 5 * 1024 * 1024) {
      return json({ success: false, error: "Payload too large" }, 413);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ success: false, error: "Invalid JSON body" }, 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ success: false, error: "Body must be a JSON object" }, 400);
    }

    const newState = await updateFleetState(body as Record<string, unknown>);

    if (process.env.FLEET_API_DEBUG === "true") {
      console.log("[fleet/sync] POST updated (LEGACY), lastUpdated=", newState.lastUpdated);
    }

    return json({
      success: true,
      lastUpdated: newState.lastUpdated,
      deprecation:
        "This endpoint is deprecated. Migrate to /api/sync/push (event-log protocol).",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[fleet/sync] POST error:", message);
    const status = message.includes("exceeds maximum") ? 413 : 500;
    return json({ success: false, error: message }, status);
  }
}
