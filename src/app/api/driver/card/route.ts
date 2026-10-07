/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { requireServerRole } from "@/lib/auth/session";
import { getDriverContext, getDriverVirtualCard } from "@/lib/driver/queries";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  const session = await requireServerRole(["driver"]);
  const ctx = await getDriverContext(session.authUserId);
  if (!ctx?.vehicle) throw AppError.notFound("Vehicle assignment");

  const card = await getDriverVirtualCard(ctx.vehicle.registrationNumber);
  if (!card) throw AppError.notFound("Virtual card");

  return ok({ card });
});
