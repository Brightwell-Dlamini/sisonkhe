/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/driver/message
 * Body: { message: string }
 *
 * Server-owned path for driver → marshal chat. Uses the same notifications
 * transport as signals, so there is ONE write path to `notifications`.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getDriverContext } from "@/lib/driver/queries";
import { notifyMarshal, getMarshalForRoute } from "@/lib/driver/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_LEN = 500;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "driver") {
      return NextResponse.json({ error: "Driver only" }, { status: 403 });
    }
    const ctx = await getDriverContext(session.authUserId);
    if (!ctx || !ctx.vehicle || !ctx.vehicle.routeId) {
      return NextResponse.json({ error: "No route assigned" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const message = String(body.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }
    if (message.length > MAX_LEN) {
      return NextResponse.json(
        { error: `Message exceeds ${MAX_LEN} characters` },
        { status: 413 }
      );
    }

    const marshal = await getMarshalForRoute(ctx.vehicle.routeId);
    if (!marshal) {
      return NextResponse.json({ error: "No marshal on route" }, { status: 404 });
    }

    const ok = await notifyMarshal(
      marshal.name,
      marshal.phone,
      ctx.fullName,
      ctx.vehicle.registrationNumber,
      message
    );
    if (!ok) {
      return NextResponse.json({ error: "Notification failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/driver/message] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
