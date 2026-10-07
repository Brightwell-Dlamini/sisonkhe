/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/qr/verify — public QR verification.
 * GET  /api/qr/verify?token=
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyQrToken } from "@/lib/qr/verify";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export const POST = withApiHandler(async (request: NextRequest) => {
  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    throw AppError.validation("Invalid JSON body.");
  }

  const token = typeof body.token === "string" ? body.token : "";
  if (!token) throw AppError.validation("Missing token field.");

  const result = await verifyQrToken(token);
  return ok(result, { headers: CORS_HEADERS });
});

export const GET = withApiHandler(async (request: NextRequest) => {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!token) throw AppError.validation("Missing token param.");

  const result = await verifyQrToken(token);
  return ok(result, { headers: CORS_HEADERS });
});
