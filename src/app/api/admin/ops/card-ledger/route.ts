/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/admin/ops/card-ledger — balance vs transaction reconstruction.
 */

import { requirePermission } from "@/lib/auth/session";
import { auditCardLedgers } from "@/lib/payments/cardLedger";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  await requirePermission("admin.ops.view");
  const report = await auditCardLedgers();
  return ok(report);
});
