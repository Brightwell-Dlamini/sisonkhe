/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { requireServerRole } from "@/lib/auth/session";
import {
  getDriverContext,
  getDriverSummary,
  getDriverRecentTrips,
} from "@/lib/driver/queries";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  const session = await requireServerRole(["driver"]);
  const context = await getDriverContext(session.authUserId);
  if (!context) throw AppError.notFound("Driver record");

  const [summary, trips] = await Promise.all([
    getDriverSummary(context.driverId),
    getDriverRecentTrips(context.driverId, 20),
  ]);

  return ok({ context, summary, trips });
});
