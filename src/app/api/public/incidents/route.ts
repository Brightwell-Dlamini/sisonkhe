/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/public/incidents — anonymous incident report.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

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

export const POST = withApiHandler(async (request: NextRequest) => {
  const body = await request.json();

  const reporterName = String(body.reporterName ?? "").trim();
  const reporterPhone = String(body.reporterPhone ?? "").trim();
  const category = String(body.category ?? "Other").trim();
  const description = String(body.description ?? "").trim();
  const vehicleReg = body.vehicleReg
    ? String(body.vehicleReg).toUpperCase()
    : null;
  const routeId = body.routeId ? String(body.routeId) : null;
  const reporterType = body.reporterType === "Driver" ? "Driver" : "Commuter";

  if (!reporterName || !reporterPhone || !description) {
    throw AppError.validation(
      "reporterName, reporterPhone, and description are required"
    );
  }

  const admin = createSupabaseAdminClient();
  const id = `inc-${randomBytes(8).toString("hex")}`;

  const { error } = await admin.from("incidents").insert({
    id,
    timestamp: new Date().toISOString(),
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
    throw AppError.internal(error.message);
  }

  return ok({ success: true, id }, { headers: CORS_HEADERS, status: 201 });
});
