/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/public/incidents
 * Anonymous incident reporting (lost property).
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const reporterName = String(body.reporterName ?? "").trim();
    const reporterPhone = String(body.reporterPhone ?? "").trim();
    const category = String(body.category ?? "Other").trim();
    const description = String(body.description ?? "").trim();
    const vehicleReg = body.vehicleReg ? String(body.vehicleReg).toUpperCase() : null;
    const routeId = body.routeId ? String(body.routeId) : null;
    const reporterType = body.reporterType === "Driver" ? "Driver" : "Commuter";

    if (!reporterName || !reporterPhone || !description) {
      return NextResponse.json(
        { error: "reporterName, reporterPhone, and description are required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const admin = createSupabaseAdminClient();
    const now = new Date();
    const id = `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const { error } = await admin.from("incidents").insert({
      id,
      timestamp: now.toISOString(),
      reporter_name: reporterName,
      reporter_phone: reporterPhone,
      reporter_type: reporterType,
      category,
      description,
      vehicle_reg: vehicleReg,
      route_id: routeId,
      status: "Pending",
      escalated_to: "None",
      messages: [],
    });

    if (error) {
      console.error("[api/public/incidents] insert error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json({ success: true, id }, { headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/public/incidents] error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
