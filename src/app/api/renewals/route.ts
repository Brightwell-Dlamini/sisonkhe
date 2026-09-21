/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  /api/renewals?status=Pending+Admin+Approval   — list (scoped by role)
 * POST /api/renewals                                  — create (operator only)
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { createRenewalSchema, RENEWAL_TERMS } from "@/lib/renewals/validation";
import {
  createRenewalRequest,
  listRenewals,
  getVehicleRegsInScope,
  type RenewalRow,
} from "@/lib/renewals/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VIEW_ROLES = ["super-admin", "admin", "fleet-manager", "operator"] as const;

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !VIEW_ROLES.includes(session.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const statusParam = request.nextUrl.searchParams.get("status");
    const status = statusParam
      ? (statusParam as RenewalRow["status"])
      : undefined;

    const renewals = await listRenewals(session, { status });
    return NextResponse.json({ renewals });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/renewals] GET error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — operator submits a renewal
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "operator" || !session.operatorId) {
      return NextResponse.json(
        { error: "Only fleet operators can submit renewal requests." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createRenewalSchema.safeParse(body);
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

    // Verify operator owns this vehicle
    const { data: vehicle } = await admin
      .from("vehicles")
      .select(
        "registration_number, vic, permit_number, permit_expiry_date, driver_id, owner_operator_id"
      )
      .eq("registration_number", input.vehicleReg)
      .maybeSingle();

    if (!vehicle) {
      return NextResponse.json(
        { error: `Vehicle ${input.vehicleReg} not found.` },
        { status: 404 }
      );
    }

    if (vehicle.owner_operator_id !== session.operatorId) {
      return NextResponse.json(
        { error: "You do not own this vehicle." },
        { status: 403 }
      );
    }

    // Check no pending request already exists
    const { data: existing } = await admin
      .from("permit_renewal_requests")
      .select("id")
      .eq("vehicle_reg", input.vehicleReg)
      .eq("status", "Pending Admin Approval")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error: `A pending renewal already exists for ${input.vehicleReg}.`,
        },
        { status: 409 }
      );
    }

    // Find driver name
    let driverName: string | null = null;
    if (vehicle.driver_id) {
      const { data: driver } = await admin
        .from("drivers")
        .select("full_name")
        .eq("id", vehicle.driver_id as string)
        .maybeSingle();
      driverName = (driver?.full_name as string | undefined) ?? null;
    }

    // Handle Master Card payment
    let masterPaymentRef: string | undefined;
    let masterPaymentAmountSzl: number | undefined;

    if (input.payWithMasterCard) {
      const term = RENEWAL_TERMS.find((t) => t.months === input.termMonths);
      if (!term) {
        return NextResponse.json({ error: "Invalid term." }, { status: 400 });
      }

      // Load master card
      const { data: card } = await admin
        .from("operator_master_cards")
        .select("id, balance_szl, status")
        .eq("operator_id", session.operatorId)
        .maybeSingle();

      if (!card) {
        return NextResponse.json(
          { error: "Master card not found." },
          { status: 404 }
        );
      }

      if (card.status !== "Active") {
        return NextResponse.json(
          { error: "Master card is frozen." },
          { status: 400 }
        );
      }

      if (Number(card.balance_szl) < term.feeSzl) {
        return NextResponse.json(
          {
            error: `Insufficient master card balance (E${Number(card.balance_szl).toFixed(2)} available, E${term.feeSzl.toFixed(2)} required).`,
          },
          { status: 400 }
        );
      }

      // Debit card
      masterPaymentRef = `REN-PAY-${Math.floor(100000 + Math.random() * 900000)}`;
      masterPaymentAmountSzl = term.feeSzl;

      await admin
        .from("operator_master_cards")
        .update({ balance_szl: Number(card.balance_szl) - term.feeSzl })
        .eq("id", card.id as string);

      // Record transaction
      await admin.from("operator_card_transactions").insert({
        id: `tx-ren-${Date.now()}`,
        card_id: card.id as string,
        timestamp: new Date().toISOString(),
        type: "PERMIT_RENEWAL_FEE",
        description: `Permit renewal fee for ${input.vehicleReg} (${input.termMonths} months)`,
        target_vehicle_reg: input.vehicleReg,
        category: "Permit Renewal",
        amount_szl: term.feeSzl,
        direction: "DEBIT",
        receipt_number: masterPaymentRef,
        status: "Completed",
      });
    }

    // Create renewal request
    const renewal = await createRenewalRequest(
      {
        vehicleReg: input.vehicleReg,
        reason: input.reason,
        comments: input.comments || undefined,
        supportingDocuments: input.supportingDocuments ?? [],
        operatorLicenseNumber: input.operatorLicenseNumber || undefined,
        odometerReading: input.odometerReading,
        yearOfManufacture: input.yearOfManufacture,
        insurancePolicy: input.insurancePolicy || undefined,
        concessionId: input.concessionId || undefined,
        termMonths: input.termMonths,
      },
      {
        operator: session.fullName,
        driverName,
        fleetId: (vehicle.vic as string | null) ?? null,
        currentPermitNumber: (vehicle.permit_number as string | null) ?? null,
        currentExpiryDate: (vehicle.permit_expiry_date as string | null) ?? null,
        masterPaymentRef,
        masterPaymentAmountSzl,
      }
    );

    return NextResponse.json({ success: true, renewal });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/renewals] POST error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
