/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public heartbeat for legacy clients — returns lastUpdated only.
 */

import { NextResponse } from "next/server";
import { getLastUpdated } from "@/lib/fleetStore";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "same-origin",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export const GET = withApiHandler(async () => {
  try {
    const lastUpdated = await getLastUpdated();
    return ok({ lastUpdated }, { headers: CORS_HEADERS });
  } catch {
    throw AppError.internal("Failed to read status");
  }
});
