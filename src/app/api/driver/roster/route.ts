/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getDriverContext } from "@/lib/driver/queries";
import { computeDriverRoster } from "@/lib/driver/roster";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "driver") {
      return NextResponse.json({ error: "Driver only" }, { status: 403 });
    }
    const ctx = await getDriverContext(session.authUserId);
    if (!ctx || !ctx.vehicle) {
      return NextResponse.json(
        { error: "No vehicle assigned" },
        { status: 404 }
      );
    }

    const month = request.nextUrl.searchParams.get("month") ?? undefined;
    const roster = await computeDriverRoster(ctx.vehicle.registrationNumber, month);

    if (!roster) {
      return NextResponse.json({ error: "No route on vehicle" }, { status: 404 });
    }

    return NextResponse.json({ roster });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/driver/roster] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
