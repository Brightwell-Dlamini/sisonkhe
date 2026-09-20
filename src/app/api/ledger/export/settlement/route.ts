/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/ledger/export/settlement?from=&to=&region=
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getLedgerScope, getSettlementSummary } from "@/lib/ledger/queries";
import { settlementToCsv } from "@/lib/ledger/csv";

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

    const summary = await getSettlementSummary(
      scope,
      from,
      to,
      params.get("region") ?? undefined
    );

    const csv = settlementToCsv(summary);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="settlement_${from}_${to}.csv"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/ledger/export/settlement] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
