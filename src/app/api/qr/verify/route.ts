/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/qr/verify — public QR verification (signed tokens only).
 * GET  /api/qr/verify?token=
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyQrToken } from "@/lib/qr/verify";
import { parseQrScanInput } from "@/lib/qr/parse";
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

function clientMeta(request: NextRequest) {
  return {
    userAgent: request.headers.get("user-agent"),
    ipHint:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
  };
}

function resolveToken(raw: string): string {
  const parsed = parseQrScanInput(raw);
  if (parsed.kind === "token") return parsed.token;
  throw AppError.validation(
    "Provide a signed QR token (v1.…) or a verify URL containing ?token=."
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export const POST = withApiHandler(async (request: NextRequest) => {
  let body: {
    token?: unknown;
    source?: unknown;
    actorUserId?: unknown;
    actorRole?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    throw AppError.validation("Invalid JSON body.");
  }

  const raw = typeof body.token === "string" ? body.token : "";
  if (!raw) throw AppError.validation("Missing token field.");

  const token = resolveToken(raw);
  const meta = clientMeta(request);
  const result = await verifyQrToken(token, {
    source: typeof body.source === "string" ? body.source : "api",
    actorUserId:
      typeof body.actorUserId === "string" ? body.actorUserId : null,
    actorRole: typeof body.actorRole === "string" ? body.actorRole : null,
    userAgent: meta.userAgent,
    ipHint: meta.ipHint,
  });

  return ok(result, { headers: CORS_HEADERS });
});

export const GET = withApiHandler(async (request: NextRequest) => {
  const raw = request.nextUrl.searchParams.get("token") ?? "";
  if (!raw) throw AppError.validation("Missing token param.");

  const token = resolveToken(raw);
  const meta = clientMeta(request);
  const result = await verifyQrToken(token, {
    source: "api-get",
    userAgent: meta.userAgent,
    ipHint: meta.ipHint,
  });

  return ok(result, { headers: CORS_HEADERS });
});
