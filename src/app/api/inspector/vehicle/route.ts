/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/inspector/vehicle?q=HSD%20101%20BM
 * GET /api/inspector/vehicle?reg=...
 * GET /api/inspector/vehicle?vic=...
 *
 * Government / traffic inspector roadside lookup.
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { lookupVehicleForInspector } from "@/lib/inspector/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("inspector.lookup");

    const q =
      request.nextUrl.searchParams.get("q") ??
      request.nextUrl.searchParams.get("reg") ??
      request.nextUrl.searchParams.get("vic");

    if (!q || !q.trim()) {
      return NextResponse.json(
        { error: "q, reg, or vic param is required" },
        { status: 400 }
      );
    }

    const vehicle = await lookupVehicleForInspector(q.trim());
    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      vehicle,
      lookedUpAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : 500;
    console.error("[api/inspector/vehicle] error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
