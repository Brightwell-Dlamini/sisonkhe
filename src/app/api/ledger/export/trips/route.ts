/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/ledger/export/trips?from=&to=
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getLedgerScope, listTrips } from "@/lib/ledger/queries";
import { tripsToCsv } from "@/lib/ledger/csv";
import { AppError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;
const MAX_ROWS = 10000;

export const GET = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole([...ALLOWED_ROLES]);
  const scope = getLedgerScope(session);
  const params = request.nextUrl.searchParams;
  const from = params.get("from");
  const to = params.get("to");
  if (!from || !to) {
    throw AppError.validation("from and to are required (YYYY-MM-DD)");
  }

  const result = await listTrips(scope, {
    fromDate: from,
    toDate: to,
    region: params.get("region") ?? undefined,
    routeId: params.get("routeId") ?? undefined,
    vehicleReg: params.get("vehicleReg") ?? undefined,
    driverId: params.get("driverId") ?? undefined,
    page: 1,
    pageSize: MAX_ROWS,
  });

  const csv = tripsToCsv(result.trips);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="trips_${from}_${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
