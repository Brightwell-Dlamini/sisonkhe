/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/inspector/vehicle?reg=HSD%20101%20BM
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { lookupVehicleForInspector } from "@/lib/inspector/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== "inspector" && session.role !== "super-admin")) {
      return NextResponse.json({ error: "Inspector access required" }, { status: 403 });
    }

    const reg = request.nextUrl.searchParams.get("reg");
    if (!reg) {
      return NextResponse.json({ error: "reg param is required" }, { status: 400 });
    }

    const vehicle = await lookupVehicleForInspector(reg);
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({ vehicle });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/inspector/vehicle] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/inspector/vehicle?reg=HSD%20101%20BM
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { lookupVehicleForInspector } from "@/lib/inspector/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== "inspector" && session.role !== "super-admin")) {
      return NextResponse.json({ error: "Inspector access required" }, { status: 403 });
    }

    const reg = request.nextUrl.searchParams.get("reg");
    if (!reg) {
      return NextResponse.json({ error: "reg param is required" }, { status: 400 });
    }

    const vehicle = await lookupVehicleForInspector(reg);
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({ vehicle });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/inspector/vehicle] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
