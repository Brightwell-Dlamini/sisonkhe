/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/qr/verify
 *
 * Body: { token: string }
 *
 * Public endpoint. Anyone can verify a QR. No authentication.
 *
 * Returns the decoded payload on success, or a failure reason.
 * Rate-limited in a future phase.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyQrToken } from "@/lib/qr/verify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    let body: { token?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { valid: false, reason: "MALFORMED", message: "Invalid JSON body." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const token = typeof body.token === "string" ? body.token : "";
    if (!token) {
      return NextResponse.json(
        {
          valid: false,
          reason: "MALFORMED",
          message: "Missing token field.",
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const result = await verifyQrToken(token);

    return NextResponse.json(result, {
      status: result.valid ? 200 : 200, // Always 200; invalid = { valid: false }
      headers: CORS_HEADERS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/qr/verify] error:", err);
    return NextResponse.json(
      { valid: false, reason: "MALFORMED", message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// GET convenience for scanning via URL:
//   /api/qr/verify?token=v1.xxxx.yyyy
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token") ?? "";
    if (!token) {
      return NextResponse.json(
        { valid: false, reason: "MALFORMED", message: "Missing token param." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const result = await verifyQrToken(token);
    return NextResponse.json(result, { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/qr/verify] GET error:", err);
    return NextResponse.json(
      { valid: false, reason: "MALFORMED", message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
