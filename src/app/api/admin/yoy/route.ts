/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getYoYView } from "@/lib/admin/yoy";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requireServerRole(["super-admin", "admin", "fleet-manager"]);
  const routeId = request.nextUrl.searchParams.get("routeId");
  const year =
    parseInt(request.nextUrl.searchParams.get("year") ?? "", 10) ||
    new Date().getFullYear();
  const compareYear =
    parseInt(request.nextUrl.searchParams.get("compareYear") ?? "", 10) ||
    year - 1;
  if (!routeId) throw AppError.validation("routeId required");

  const view = await getYoYView(routeId, year, compareYear);
  if (!view) throw AppError.notFound("YoY view");
  return ok({ view });
});
