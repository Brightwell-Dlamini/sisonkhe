/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/ledger/trips
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getLedgerScope, listTrips } from "@/lib/ledger/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"];

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
        { error: "from and to are required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(params.get("pageSize")) || 50));

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

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/ledger/trips] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
