/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/marshal/queue/suggestions?routeId=
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { buildQueueSuggestions } from "@/lib/queue/suggestions";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async (req: NextRequest) => {
  await requireServerRole([
    "marshal",
    "admin",
    "super-admin",
    "fleet-manager",
  ]);
  const routeId = req.nextUrl.searchParams.get("routeId");
  const terminalId = req.nextUrl.searchParams.get("terminalId");
  const region = req.nextUrl.searchParams.get("region");

  const result = await buildQueueSuggestions({
    routeId: routeId || null,
    terminalId: terminalId || null,
    region: region || null,
  });

  return ok(result);
});
