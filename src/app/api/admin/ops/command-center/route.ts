/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/admin/ops/command-center?region=&routeId=
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { buildCommandCenter } from "@/lib/ops/commandCenter";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requireServerRole([
    "super-admin",
    "admin",
    "fleet-manager",
  ]);

  const params = request.nextUrl.searchParams;
  const snapshot = await buildCommandCenter({
    region: params.get("region"),
    routeId: params.get("routeId"),
  });

  return ok(snapshot);
});
