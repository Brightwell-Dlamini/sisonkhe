/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import {
  getDriverContext,
  getDriverSummary,
  getDriverRecentTrips,
} from "@/lib/driver/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "driver") {
      return NextResponse.json({ error: "Driver access required" }, { status: 403 });
    }

    const context = await getDriverContext(session.authUserId);
    if (!context) {
      return NextResponse.json({ error: "Driver record not found" }, { status: 404 });
    }

    const [summary, trips] = await Promise.all([
      getDriverSummary(context.driverId),
      getDriverRecentTrips(context.driverId, 20),
    ]);

    return NextResponse.json({ context, summary, trips });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/driver/summary] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
