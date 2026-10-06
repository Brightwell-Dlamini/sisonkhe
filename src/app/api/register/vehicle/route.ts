/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/register/vehicle — public asset collection only.
 * Does NOT link driver or operator. Staff assign later.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { selfRegisterVehicleSchema } from "@/lib/vehicles/selfRegister";
import { normalizePlate } from "@/lib/domain/identity";
import { rateLimit } from "@/lib/domain/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function generateVIC(reg: string): string {
  if (!reg) return "";
  const cleanReg = reg.toUpperCase().replace(/\s+/g, "");
  const lettersOnly = cleanReg.replace(/[^A-Z]/g, "");
  const digitsOnly = cleanReg.replace(/[^0-9]/g, "");

  let prefix = "";
  if (cleanReg.startsWith("MSD") || cleanReg.includes("MZ")) prefix = "MMZ";
  else if (cleanReg.startsWith("HSD") || cleanReg.includes("BM")) prefix = "HBM";
  else if (cleanReg.startsWith("LSD") || cleanReg.includes("LU")) prefix = "SLU";
  else if (cleanReg.startsWith("SSD") || cleanReg.includes("SH")) prefix = "SNH";
  else if (lettersOnly.length >= 3) {
    prefix = `${lettersOnly.charAt(0)}${lettersOnly.slice(-2)}`;
  } else if (lettersOnly.length > 0) {
    prefix = lettersOnly.padEnd(3, "X").slice(0, 3);
  } else {
    prefix = "SZV";
  }

  const digits = (digitsOnly || "000").slice(-3).padStart(3, "0");
  return `${prefix}-${digits}`;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rl = rateLimit(`reg-vehicle:${ip}`, 15, 15 * 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many registrations. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = selfRegisterVehicleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const plate = normalizePlate(input.registrationNumber);
    const admin = createSupabaseAdminClient();

    const { data: existing } = await admin
      .from("vehicles")
      .select("registration_number")
      .eq("registration_number", plate)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Vehicle ${plate} is already registered.` },
        { status: 409 }
      );
    }

    const vic = generateVIC(plate);

    {
      const { data: vicClash } = await admin
        .from("vehicles")
        .select("registration_number")
        .eq("vic", vic)
        .maybeSingle();
      if (vicClash) {
        return NextResponse.json(
          { error: `Generated VIC ${vic} already exists. Contact admin.` },
          { status: 409 }
        );
      }
    }

    const { error: insertErr } = await admin.from("vehicles").insert({
      registration_number: plate,
      vic,
      make: input.make,
      model: input.model,
      seating_capacity: input.seatingCapacity,
      classification: input.classification,
      route_assignment_id: null,
      loading_bay: input.loadingBay || null,
      owner_name: input.ownerName || null,
      owner_phone: input.ownerPhone || null,
      owner_operator_id: null,
      driver_id: null,
      status: "Waiting",
      current_queue_position: 0,
      permit_number: input.permitNumber || null,
      permit_status: input.permitNumber ? "Active" : null,
      permit_issue_date: input.permitIssueDate || null,
      permit_expiry_date: input.permitExpiryDate || null,
      cof_number: input.cofNumber || null,
      cof_issue_date: input.cofIssueDate || null,
      cof_expiry_date: input.cofExpiryDate || null,
      last_inspection_date: null,
      association: input.association || null,
      insurance_expiry: input.insuranceExpiry || null,
      roadworthiness_expiry: input.roadworthinessExpiry || null,
      is_mid_month_addition: false,
      registration_date: new Date().toISOString().split("T")[0],
      month_registered: new Date().toISOString().slice(0, 7),
    });

    if (insertErr) {
      return NextResponse.json(
        { error: `Could not register vehicle: ${insertErr.message}` },
        { status: 500 }
      );
    }

    // Virtual card is NOT auto-issued on public register — admin/operator does money later.

    return NextResponse.json({
      success: true,
      registrationNumber: plate,
      vic,
      message:
        "Vehicle recorded. No driver was linked. An authorised staff member will assign driver, route, and operator.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
