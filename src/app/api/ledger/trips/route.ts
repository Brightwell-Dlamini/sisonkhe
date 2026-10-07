/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/ledger/trips
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getLedgerScope, listTrips } from "@/lib/ledger/queries";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

export const GET = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole([...ALLOWED_ROLES]);
  const scope = getLedgerScope(session);
  const params = request.nextUrl.searchParams;

  const from = params.get("from");
  const to = params.get("to");
  if (!from || !to) {
    throw AppError.validation("from and to are required (YYYY-MM-DD)");
  }

  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(
    200,
    Math.max(1, Number(params.get("pageSize")) || 50)
  );

  const result = await listTrips(scope, {
    fromDate: from,
    toDate: to,
    region: params.get("region") ?? undefined,
    routeId: params.get("routeId") ?? undefined,
    vehicleReg: params.get("vehicleReg") ?? undefined,
    driverId: params.get("driverId") ?? undefined,
    page,
    pageSize,
  });

  return ok(result);
});
