/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/public/adverts?region=Hhohho
 *
 * Public adverts only. No auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { listPublicAdverts } from "@/lib/public/kiosk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  try {
    const region = request.nextUrl.searchParams.get("region") ?? "Hhohho";
    const adverts = await listPublicAdverts(region);
    return NextResponse.json({ adverts }, { headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/public/adverts] error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
