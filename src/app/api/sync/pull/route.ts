/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/sync/pull?since=<seq>&limit=<n>
 */

import type { NextRequest } from "next/server";
import { pullEvents } from "@/lib/sync/server";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async (request: NextRequest) => {
  const since = Number(request.nextUrl.searchParams.get("since") ?? "0");
  const limit = Math.min(
    Number(request.nextUrl.searchParams.get("limit") ?? "100"),
    200
  );

  if (Number.isNaN(since) || since < 0) {
    throw AppError.validation("Invalid since parameter");
  }

  const result = await pullEvents(since, limit);
  return ok(result);
});
