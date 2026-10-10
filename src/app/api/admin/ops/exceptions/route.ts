/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/admin/ops/exceptions — unified financial exception queue.
 * Combines payment reconciliation issues and card-ledger balance drifts.
 */

import { requirePermission } from "@/lib/auth/session";
import { buildExceptionQueue } from "@/lib/payments/exceptions";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = withApiHandler(async () => {
  await requirePermission("admin.ops.view");
  const report = await buildExceptionQueue({ includeCardLedger: true });
  return ok(report);
});
