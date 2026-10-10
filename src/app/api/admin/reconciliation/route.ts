/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/admin/reconciliation — payment / rank-fee reconciliation report.
 */

import { requirePermission } from "@/lib/auth/session";
import { runPaymentReconciliation } from "@/lib/payments/reconciliation";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  await requirePermission("admin.ops.view");
  const report = await runPaymentReconciliation();
  return ok(report);
});
