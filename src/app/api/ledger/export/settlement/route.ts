/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/ledger/export/settlement?from=&to=
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getLedgerScope, getSettlementSummary } from "@/lib/ledger/queries";
import { settlementToCsv } from "@/lib/ledger/csv";
import { AppError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/response";

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
      "Cache-Control": "no-store",
    },
  });
});
