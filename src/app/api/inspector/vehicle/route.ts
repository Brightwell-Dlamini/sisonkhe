/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { lookupVehicleForInspector } from "@/lib/inspector/queries";
import { rateLimitAsync } from "@/lib/domain/rateLimit";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async (request: NextRequest) => {
  const session = await requirePermission("inspector.lookup");

  const rl = await rateLimitAsync(
    `insp-lookup:${session.authUserId}`,
    60,
    60_000
  );
  if (!rl.ok) {
    throw new AppError(
      "RATE_LIMITED",
      "Lookup rate limit exceeded. Wait a moment.",
      { details: { retryAfterSec: rl.retryAfterSec } }
    );
  }

  const q =
    request.nextUrl.searchParams.get("q") ??
    request.nextUrl.searchParams.get("reg") ??
    request.nextUrl.searchParams.get("vic");

  if (!q?.trim()) {
    throw AppError.validation("q, reg, or vic param is required");
  }

  const vehicle = await lookupVehicleForInspector(q.trim());
  if (!vehicle) throw AppError.notFound("Vehicle");

  return ok({
    vehicle,
    lookedUpAt: new Date().toISOString(),
  });
});
