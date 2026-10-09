/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/admin/compliance/queue — actionable compliance work items.
 */

import { requireAdminScope } from "@/lib/auth/session";
import { buildComplianceWorkQueue } from "@/lib/compliance/workQueue";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  await requireAdminScope();
  const report = await buildComplianceWorkQueue();
  return ok(report);
});
