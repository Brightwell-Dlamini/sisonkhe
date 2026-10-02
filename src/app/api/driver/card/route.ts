/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import {
  getDriverContext,
  getDriverVirtualCard,
} from "@/lib/driver/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "driver") {
      return NextResponse.json({ error: "Driver only" }, { status: 403 });
    }
    const ctx = await getDriverContext(session.authUserId);
    if (!ctx || !ctx.vehicle) {
      return NextResponse.json({ error: "No vehicle" }, { status: 404 });
    }

    const card = await getDriverVirtualCard(ctx.vehicle.registrationNumber);
    if (!card) {
      return NextResponse.json({ error: "No card issued" }, { status: 404 });
    }

    return NextResponse.json({ card });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/driver/card] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
