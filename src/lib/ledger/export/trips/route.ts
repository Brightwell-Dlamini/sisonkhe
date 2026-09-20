/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/ledger/export/trips?from=&to=&region=
 *
 * Streams a CSV of all trips in range (no pagination — full export).
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getLedgerScope, listTrips } from "@/lib/ledger/queries";
import { tripsToCsv } from "@/lib/ledger/csv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"];
const MAX_ROWS = 10000;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const scope = getLedgerScope(session);
    const params = request.nextUrl.searchParams;

    const from = params.get("from");
    const to = params.get("to");
    if (!from || !to) {
      return NextResponse.json(
        { error: "from and to are required" },
        { status: 400 }
      );
    }

    // Fetch first page just to know total
    const firstPage = await listTrips(scope, {
      fromDate: from,
      toDate: to,
      region: params.get("region") ?? undefined,
      routeId: params.get("routeId") ?? undefined,
      vehicleReg: params.get("vehicleReg") ?? undefined,
      driverId: params.get("driverId") ?? undefined,
      page: 1,
      pageSize: 200,
    });

    if (firstPage.total > MAX_ROWS) {
      return NextResponse.json(
        {
          error: `Too many rows (${firstPage.total}). Narrow the date range to under ${MAX_ROWS} rows.`,
        },
        { status: 413 }
      );
    }

    // Fetch all pages
    const totalPages = Math.ceil(firstPage.total / 200);
    let allTrips = firstPage.trips;
    for (let p = 2; p <= totalPages; p++) {
      const page = await listTrips(scope, {
        fromDate: from,
        toDate: to,
        region: params.get("region") ?? undefined,
        routeId: params.get("routeId") ?? undefined,
        vehicleReg: params.get("vehicleReg") ?? undefined,
        driverId: params.get("driverId") ?? undefined,
        page: p,
        pageSize: 200,
      });
      allTrips = allTrips.concat(page.trips);
    }

    const csv = tripsToCsv(allTrips);
    const filename = `trips_${from}_to_${to}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/ledger/export/trips] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
