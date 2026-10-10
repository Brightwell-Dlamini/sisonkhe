/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/admin/ops/regional-summary — national heat-map pressure by region.
 * Super-admin / national scope only.
 */

import { requirePermission, requireServerSession } from "@/lib/auth/session";
import { isNationalScope } from "@/lib/auth/permissions";
import { buildRegionalSummary } from "@/lib/ops/regionalSummary";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = withApiHandler(async () => {
  await requirePermission("admin.ops.view");
  const user = await requireServerSession();
  if (!isNationalScope(user)) {
    throw AppError.forbidden();
  }
  const report = await buildRegionalSummary();
  return ok(report);
});
