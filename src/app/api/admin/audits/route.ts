/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/admin/audits — paginated merged audit trail.
 */

import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { listAuditEntries } from "@/lib/admin/audits";
import { parsePageParams } from "@/lib/pagination";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requirePermission("admin.audits.view");
  const { page, limit, offset } = parsePageParams(request.nextUrl.searchParams, {
    limit: 50,
    maxLimit: 200,
  });
  const { entries, meta } = await listAuditEntries(limit, offset);
  return ok({ entries }, { meta: { ...meta, page, limit } });
});
