/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/sync/pull?since=<seq>&limit=<n>
 * Return events after the given watermark.
 */

import { NextRequest, NextResponse } from "next/server";
import { pullEvents } from "@/lib/sync/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const since = Number(request.nextUrl.searchParams.get("since") ?? "0");
    const limit = Math.min(
      Number(request.nextUrl.searchParams.get("limit") ?? "100"),
      200
    );

    if (Number.isNaN(since) || since < 0) {
      return NextResponse.json({ error: "Invalid since parameter" }, { status: 400 });
    }

    const result = await pullEvents(since, limit);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sync/pull]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
