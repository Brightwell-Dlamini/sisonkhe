/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getDriverContext } from "@/lib/driver/queries";
import { computeDriverRoster } from "@/lib/driver/roster";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole(["driver"]);
  const ctx = await getDriverContext(session.authUserId);
  if (!ctx?.vehicle) throw AppError.notFound("Vehicle assignment");

  const month = request.nextUrl.searchParams.get("month") ?? undefined;
  const roster = await computeDriverRoster(
    ctx.vehicle.registrationNumber,
    month
  );
  if (!roster) throw AppError.notFound("Route on vehicle");

  return ok({ roster });
});
