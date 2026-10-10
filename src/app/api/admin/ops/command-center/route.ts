/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/admin/ops/command-center?region=&routeId=
 */

import type { NextRequest } from "next/server";
import { requirePermission, requireAdminScope } from "@/lib/auth/session";
import { buildCommandCenter } from "@/lib/ops/commandCenter";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requirePermission("admin.command_centre");
  const { region: scopeRegion } = await requireAdminScope();

  const params = request.nextUrl.searchParams;
  // Regional admins cannot override scope to another region
  const requestedRegion = params.get("region");
  const region =
    scopeRegion !== null ? scopeRegion : requestedRegion;

  const snapshot = await buildCommandCenter({
    region,
    routeId: params.get("routeId"),
  });

  return ok(snapshot);
});
