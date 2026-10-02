/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/register/vehicle — public self-registration.
 * Links the vehicle to a driver via National ID (not internal driver id).
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { selfRegisterVehicleSchema } from "@/lib/vehicles/selfRegister";

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
    const admin = createSupabaseAdminClient();

    const { data: driver, error: driverErr } = await admin
      .from("drivers")
      .select("id, full_name, national_id, assigned_vehicle_reg, phone")
      .eq("national_id", input.driverNationalId)
      .maybeSingle();

    if (driverErr) {
      console.error("[api/register/vehicle] driver lookup:", driverErr);
      return NextResponse.json(
        { error: "Could not look up driver by National ID." },
        { status: 500 }
      );
    }

    if (!driver) {
      return NextResponse.json(
        {
          error:
            "No driver found with that National ID. Register as a driver first at /register/driver, then register the vehicle with the same National ID.",
        },
        { status: 404 }
      );
    }

    if (driver.assigned_vehicle_reg) {
      return NextResponse.json(
        {
          error: `This driver is already linked to vehicle ${driver.assigned_vehicle_reg}. Contact admin to change assignment.`,
        },
        { status: 409 }
      );
    }

    const { data: existing } = await admin
      .from("vehicles")
      .select("registration_number")
      .eq("registration_number", input.registrationNumber)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Vehicle ${input.registrationNumber} is already registered.` },
        { status: 409 }
      );
    }

    const vic = generateVIC(input.registrationNumber);

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

    const ownerName = input.ownerName || driver.full_name;
    const ownerPhone = input.ownerPhone || driver.phone;

    const { error: insertErr } = await admin.from("vehicles").insert({
      registration_number: input.registrationNumber,
      vic,
      make: input.make,
      model: input.model,
      seating_capacity: input.seatingCapacity,
      classification: input.classification,
      route_assignment_id: null,
      loading_bay: input.loadingBay || null,
      owner_name: ownerName || null,
      owner_phone: ownerPhone || null,
      owner_operator_id: null,
      driver_id: driver.id,
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
      console.error("[api/register/vehicle] insert error:", insertErr);
      return NextResponse.json(
        { error: `Could not register vehicle: ${insertErr.message}` },
        { status: 500 }
      );
    }

    const { error: linkErr } = await admin
      .from("drivers")
      .update({ assigned_vehicle_reg: input.registrationNumber })
      .eq("id", driver.id);

    if (linkErr) {
      console.warn("[api/register/vehicle] driver link update failed:", linkErr);
    }

    const syntheticCardId = `VCARD-${input.registrationNumber.replace(/\s+/g, "-")}`;
    const now = new Date();
    const regFeeReceipt = `RCP-REG-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const clean = input.registrationNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = (hash << 5) - hash + clean.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);
    const p2 = String(1000 + (positiveHash % 9000));
    const p3 = String(1000 + (Math.floor(positiveHash / 10) % 9000));
    const p4 = String(1000 + (Math.floor(positiveHash / 100) % 9000));
    const cardNumber = `5342 ${p2} ${p3} ${p4}`;

    const { error: cardErr } = await admin.from("vehicle_virtual_cards").insert({
      id: syntheticCardId,
      card_number: cardNumber,
      cvv_hash: "pending-hash",
      expiry_date: "09/31",
      vehicle_reg: input.registrationNumber,
      vic,
      cardholder_name: ownerName || "Driver",
      status: "Active",
      balance_szl: 1525.0,
      registration_fee_paid: true,
      registration_fee_amount: 450.0,
      registration_fee_date: now.toISOString().split("T")[0],
      registration_receipt_ref: regFeeReceipt,
      card_tier: "Commercial Concession",
      daily_spend_limit_szl: 1500.0,
      qr_payload: null,
    });

    if (cardErr) {
      console.warn("[api/register/vehicle] virtual card issue failed:", cardErr);
    }

    return NextResponse.json({
      success: true,
      registrationNumber: input.registrationNumber,
      vic,
      driverId: driver.id,
      driverName: driver.full_name,
      driverNationalId: input.driverNationalId,
      message: "Vehicle registered and linked to your driver profile via National ID.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/register/vehicle] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
