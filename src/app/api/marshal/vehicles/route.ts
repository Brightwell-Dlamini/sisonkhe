/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/marshal/vehicles — all vehicles in this marshal's scope
 * (both queued and off-queue).
 */

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getMarshalContext, listVehiclesForMarshal } from "@/lib/marshal/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "marshal") {
      return NextResponse.json({ error: "Marshal only" }, { status: 403 });
    }
    const ctx = await getMarshalContext(session.authUserId);
    if (!ctx) {
      return NextResponse.json({ error: "No marshal context" }, { status: 404 });
    }
    const vehicles = await listVehiclesForMarshal(ctx);
    return NextResponse.json({ vehicles });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/marshal/vehicles] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
