/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getRotationView } from "@/lib/admin/rotation";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requireServerRole(["super-admin", "admin", "fleet-manager"]);
  const routeId = request.nextUrl.searchParams.get("routeId");
  const month = request.nextUrl.searchParams.get("month") ?? undefined;
  if (!routeId) throw AppError.validation("routeId required");

  const view = await getRotationView(routeId, month);
  if (!view) throw AppError.notFound("Rotation view");
  return ok({ view });
});
