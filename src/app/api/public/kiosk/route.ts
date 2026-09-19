/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/public/kiosk?region=Hhohho
 *
 * Public, unauthenticated kiosk data.
 * Returns a curated snapshot — no PII, no financial data, no internal IDs.
 *
 * Caching: 5 second edge cache (kiosk polls every 8s).
 */

import { NextRequest, NextResponse } from "next/server";
import { getKioskSnapshot } from "@/lib/public/kiosk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  try {
    const region = request.nextUrl.searchParams.get("region") ?? undefined;
    const snapshot = await getKioskSnapshot(region ?? undefined);

    return NextResponse.json(snapshot, { headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/public/kiosk] error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
