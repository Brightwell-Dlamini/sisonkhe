/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/driver/signal
 * Body: { signalId, kind, note?, occurredAt }
 *
 * Driver emits an intent. This route:
 *   - validates the driver has a vehicle + route
 *   - persists the signal (idempotent on signalId)
 *   - notifies the assigned marshal
 *
 * It does NOT mutate vehicles.status. Only the marshal does that.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getDriverContext } from "@/lib/driver/queries";
import {
  emitDriverSignal,
  DRIVER_SIGNALS,
  type DriverSignalKind,
} from "@/lib/domain/driverSignal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "driver" || !session.driverId) {
      return NextResponse.json({ error: "Driver only" }, { status: 403 });
    }

    const ctx = await getDriverContext(session.authUserId);
    if (!ctx || !ctx.vehicle) {
      return NextResponse.json({ error: "No vehicle assigned" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const signalId = String(body.signalId ?? "").trim();
    const kind = String(body.kind ?? "").trim() as DriverSignalKind;
    const note = body.note ? String(body.note) : null;
    const occurredAt = body.occurredAt
      ? String(body.occurredAt)
      : new Date().toISOString();

    if (!signalId) {
      return NextResponse.json({ error: "signalId required" }, { status: 400 });
    }
    if (!DRIVER_SIGNALS.includes(kind)) {
      return NextResponse.json({ error: "Unknown signal kind" }, { status: 400 });
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
      return NextResponse.json({ error: result.error ?? "Failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      duplicate: result.duplicate ?? false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/driver/signal] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
