/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/marshal/terminal — context + vehicles + summary in one call.
 */

import { requireServerRole } from "@/lib/auth/session";
import {
  getMarshalContext,
  listVehiclesForMarshal,
  getMarshalSummary,
} from "@/lib/marshal/queries";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  const session = await requireServerRole(["marshal"]);
  const context = await getMarshalContext(session.authUserId);
  if (!context) throw AppError.notFound("Marshal assignment");

  const [vehicles, summary] = await Promise.all([
    listVehiclesForMarshal(context),
    getMarshalSummary(context),
  ]);

  return ok({ context, vehicles, summary });
});
