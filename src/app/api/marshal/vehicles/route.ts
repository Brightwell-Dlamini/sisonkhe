/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/marshal/vehicles
 */

import { requireServerRole } from "@/lib/auth/session";
import {
  getMarshalContext,
  listVehiclesForMarshal,
} from "@/lib/marshal/queries";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  const session = await requireServerRole(["marshal"]);
  const ctx = await getMarshalContext(session.authUserId);
  if (!ctx) throw AppError.notFound("Marshal context");

  const vehicles = await listVehiclesForMarshal(ctx);
  return ok({ vehicles });
});
