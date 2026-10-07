/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/marshal/roster?month=YYYY-MM
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getMarshalContext } from "@/lib/marshal/queries";
import { computeRouteRoster } from "@/lib/marshal/roster";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole(["marshal"]);
  const ctx = await getMarshalContext(session.authUserId);
  if (!ctx) throw AppError.notFound("Marshal context");

  const month = request.nextUrl.searchParams.get("month") ?? undefined;
  const roster = await computeRouteRoster(ctx, month);
  if (!roster) throw AppError.notFound("Route assignment");

  return ok({ roster });
});
