/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { requireServerRole } from "@/lib/auth/session";
import { listOperatorVehicleCards } from "@/lib/operator/queries";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  const session = await requireServerRole(["operator"]);
  if (!session.operatorId) throw AppError.forbidden("Operator profile required");

  const vehicles = await listOperatorVehicleCards(session.operatorId);
  return ok({ vehicles });
});
