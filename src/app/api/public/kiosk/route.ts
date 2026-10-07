/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/public/kiosk?region=
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getKioskSnapshot } from "@/lib/public/kiosk";
import { ok, withApiHandler } from "@/lib/api/response";

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

export const GET = withApiHandler(async (request: NextRequest) => {
  const region = request.nextUrl.searchParams.get("region") ?? undefined;
  const snapshot = await getKioskSnapshot(region ?? undefined);
  return ok(snapshot, { headers: CORS_HEADERS });
});
