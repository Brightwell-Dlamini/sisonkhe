/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Driver intent signal. Does NOT mutate vehicles.status.
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getDriverContext } from "@/lib/driver/queries";
import {
  emitDriverSignal,
  DRIVER_SIGNALS,
  type DriverSignalKind,
} from "@/lib/domain/driverSignal";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole(["driver"]);
  if (!session.driverId) throw AppError.forbidden("Driver profile required");

  const ctx = await getDriverContext(session.authUserId);
  if (!ctx?.vehicle) throw AppError.notFound("Vehicle assignment");

  const body = await request.json().catch(() => ({}));
  const signalId = String(body.signalId ?? "").trim();
  const kind = String(body.kind ?? "").trim() as DriverSignalKind;
  const note = body.note ? String(body.note) : null;
  const occurredAt = body.occurredAt
    ? String(body.occurredAt)
    : new Date().toISOString();

  if (!signalId) throw AppError.validation("signalId required");
  if (!DRIVER_SIGNALS.includes(kind)) {
    throw AppError.validation("Unknown signal kind");
  }

  const result = await emitDriverSignal({
    signalId,
    kind,
    driverId: session.driverId,
    driverName: ctx.fullName,
    vehicleReg: ctx.vehicle.registrationNumber,
    routeId: ctx.vehicle.routeId,
    note,
    occurredAt,
  });

  if (!result.ok) {
    throw AppError.internal(result.error ?? "Failed to emit signal");
  }

  return ok({ success: true, duplicate: result.duplicate ?? false });
});
