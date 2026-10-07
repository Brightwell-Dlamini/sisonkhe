/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/marshal/queue/suggestions?routeId=
 * Rank-queue intelligence for the active marshal.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { buildQueueSuggestions } from "@/lib/queue/suggestions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireServerRole(["marshal", "admin", "super-admin", "fleet-manager"]);
    const routeId = req.nextUrl.searchParams.get("routeId");
    const terminalId = req.nextUrl.searchParams.get("terminalId");
    const region = req.nextUrl.searchParams.get("region");

    const result = await buildQueueSuggestions({
      routeId: routeId || null,
      terminalId: terminalId || null,
      region: region || null,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const status =
      msg === "UNAUTHENTICATED"
        ? 401
        : msg === "FORBIDDEN"
          ? 403
          : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
