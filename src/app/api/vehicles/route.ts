/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { createVehicleSchema } from "@/lib/vehicles/validation";
import { listVehicles } from "@/lib/vehicles/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

// ---------------------------------------------------------------------------
// VIC generation — mirrors src/utils/helper.ts generateVIC
// ---------------------------------------------------------------------------

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
    prefix = (lettersOnly + "MZ").slice(0, 3);
  } else {
    prefix = "MMZ";
  }

  const digits =
    digitsOnly.length > 0
      ? digitsOnly.padStart(3, "0").slice(-3)
      : "001";

  return `${prefix}-${digits}`;
}

// ---------------------------------------------------------------------------
// GET — list
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    await requireServerRole([...ALLOWED_ROLES]);
    const vehicles = await listVehicles();
    return NextResponse.json({ vehicles });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED" ? 401 :
      message === "FORBIDDEN" ? 403 : 500;
    console.error("[api/vehicles] GET error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// ---------------------------------------------------------------------------
// POST — create
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    await requireServerRole([...ALLOWED_ROLES]);

    const body = await request.json();
    const parsed = createVehicleSchema.safeParse(body);

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

    // --- Duplicate check ---
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

    // --- Route validation ---
    if (input.routeAssignmentId) {
      const { data: route } = await admin
        .from("routes")
        .select("id")
        .eq("id", input.routeAssignmentId)
        .maybeSingle();
      if (!route) {
        return NextResponse.json(
          { error: `Route ${input.routeAssignmentId} not found.` },
          { status: 404 }
        );
      }
    }

    // --- Driver validation ---
    if (input.driverId) {
      const { data: driver } = await admin
        .from("drivers")
        .select("id, assigned_vehicle_reg")
        .eq("id", input.driverId)
        .maybeSingle();
      if (!driver) {
        return NextResponse.json(
          { error: `Driver not found.` },
          { status: 404 }
        );
      }
      if (driver.assigned_vehicle_reg) {
        return NextResponse.json(
          {
            error: `Driver is already assigned to vehicle ${driver.assigned_vehicle_reg}.`,
          },
          { status: 409 }
        );
      }
    }

    // --- Generate VIC ---
    const vic = input.vic || generateVIC(input.registrationNumber);

    // --- Insert vehicle ---
    const { error: insertErr } = await admin.from("vehicles").insert({
      registration_number: input.registrationNumber,
      vic,
      make: input.make,
      model: input.model,
      seating_capacity: input.seatingCapacity,
      classification: input.classification,
      route_assignment_id: input.routeAssignmentId || null,
      loading_bay: input.loadingBay || null,
      owner_name: input.ownerName || null,
      owner_phone: input.ownerPhone || null,
      owner_operator_id: input.ownerOperatorId || null,
      driver_id: input.driverId || null,
      status: "Waiting",
      current_queue_position: 0,
      permit_number: input.permitNumber || null,
      permit_status: input.permitStatus || "Active",
      permit_issue_date: input.permitIssueDate || null,
      permit_expiry_date: input.permitExpiryDate || null,
      cof_number: input.cofNumber || null,
      cof_issue_date: input.cofIssueDate || null,
      cof_expiry_date: input.cofExpiryDate || null,
      last_inspection_date: input.lastInspectionDate || null,
      association: input.association || null,
      insurance_expiry: input.insuranceExpiry || null,
      roadworthiness_expiry: input.roadworthinessExpiry || null,
      is_mid_month_addition: input.isMidMonthAddition ?? false,
      registration_date: new Date().toISOString().split("T")[0],
      month_registered: input.monthRegistered || null,
      mid_month_join_day: input.midMonthJoinDay ?? null,
      monthly_sequence_base_index: input.monthlySequenceBaseIndex ?? null,
    });

    if (insertErr) {
      console.error("[api/vehicles] insert error:", insertErr);
      return NextResponse.json(
        { error: `Could not create vehicle: ${insertErr.message}` },
        { status: 500 }
      );
    }

    // --- Sync driver ↔ vehicle assignment ---
    if (input.driverId) {
      await admin
        .from("drivers")
        .update({ assigned_vehicle_reg: input.registrationNumber })
        .eq("id", input.driverId);
    }

    // --- Auto-issue Virtual Transit Card ---
    const syntheticCardId = `VCARD-${input.registrationNumber.replace(/\s+/g, "-")}`;
    const now = new Date();
    const regFeeReceipt = `RCP-REG-2026-${Math.floor(100000 + Math.random() * 900000)}`;

    // deterministic 16-digit card number from reg
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

    const { error: cardErr } = await admin
      .from("vehicle_virtual_cards")
      .insert({
        id: syntheticCardId,
        card_number: cardNumber,
        cvv_hash: "pending-hash", // TODO: proper hashing in Phase 5
        expiry_date: "09/31",
        vehicle_reg: input.registrationNumber,
        vic,
        cardholder_name: input.ownerName || "Fleet Operator",
        status: "Active",
        balance_szl: 1525.0, // 2000 preload - 450 reg - 25 rank sample
        registration_fee_paid: true,
        registration_fee_amount: 450.0,
        registration_fee_date: now.toISOString().split("T")[0],
        registration_receipt_ref: regFeeReceipt,
        card_tier: "Commercial Concession",
        daily_spend_limit_szl: 1500.0,
        qr_payload: null,
      });

    if (cardErr) {
      // Non-fatal — vehicle exists, card can be re-issued later
      console.warn("[api/vehicles] virtual card issue failed:", cardErr);
    }

    return NextResponse.json({
      success: true,
      registrationNumber: input.registrationNumber,
      vic,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED" ? 401 :
      message === "FORBIDDEN" ? 403 : 500;
    console.error("[api/vehicles] POST error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
