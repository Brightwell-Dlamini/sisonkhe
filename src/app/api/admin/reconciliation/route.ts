/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/admin/reconciliation — payment / rank-fee reconciliation report.
 */

import { NextResponse } from "next/server";
import { requireAdminScope } from "@/lib/auth/session";
import { runPaymentReconciliation } from "@/lib/payments/reconciliation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdminScope();
    const report = await runPaymentReconciliation();
    return NextResponse.json(report, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const status =
      msg === "UNAUTHENTICATED"
        ? 401
        : msg === "FORBIDDEN" || msg === "REGION_REQUIRED"
          ? 403
          : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
