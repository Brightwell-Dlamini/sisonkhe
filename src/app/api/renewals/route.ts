/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { createRenewalSchema, RENEWAL_TERMS } from "@/lib/renewals/validation";
import {
  createRenewalRequest,
  listRenewals,
  type RenewalRow,
} from "@/lib/renewals/queries";
import { normalizePlate } from "@/lib/domain/identity";
import { nextReceiptNumber } from "@/lib/domain/serials";
import { writeAudit } from "@/lib/domain/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VIEW_ROLES = ["super-admin", "admin", "fleet-manager", "operator"] as const;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !VIEW_ROLES.includes(session.role as (typeof VIEW_ROLES)[number])) {
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
    const plate = normalizePlate(input.vehicleReg);
    const admin = createSupabaseAdminClient();

    const { data: vehicle } = await admin
      .from("vehicles")
      .select(
        "registration_number, vic, permit_number, permit_expiry_date, driver_id, owner_operator_id, status"
      )
      .eq("registration_number", plate)
      .maybeSingle();

    if (!vehicle) {
      return NextResponse.json(
        { error: `Vehicle ${plate} not found.` },
        { status: 404 }
      );
    }

    if (vehicle.owner_operator_id !== session.operatorId) {
      return NextResponse.json(
        { error: "You do not own this vehicle." },
        { status: 403 }
      );
    }

    if (vehicle.status === "Loading" || vehicle.status === "Departed") {
      return NextResponse.json(
        {
          error: `Vehicle is ${vehicle.status}. Return to Waiting before submitting a renewal.`,
        },
        { status: 409 }
      );
    }

    const { data: existing } = await admin
      .from("permit_renewal_requests")
      .select("id")
      .eq("vehicle_reg", plate)
      .in("status", ["Pending Admin Approval", "Approved"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error: `An open renewal already exists for ${plate} (pending or approved awaiting print).`,
        },
        { status: 409 }
      );
    }

    let driverName: string | null = null;
    if (vehicle.driver_id) {
      const { data: driver } = await admin
        .from("drivers")
        .select("full_name")
        .eq("id", vehicle.driver_id as string)
        .maybeSingle();
      driverName = (driver?.full_name as string | undefined) ?? null;
    }

    let masterPaymentRef: string | undefined;
    let masterPaymentAmountSzl: number | undefined;

    if (input.payWithMasterCard) {
      const term = RENEWAL_TERMS.find((t) => t.months === input.termMonths);
      if (!term) {
        return NextResponse.json({ error: "Invalid term." }, { status: 400 });
      }

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

      const bal = Number(card.balance_szl);
      if (bal < term.feeSzl) {
        return NextResponse.json(
          {
            error: `Insufficient master card balance (E${bal.toFixed(2)} available, E${term.feeSzl.toFixed(2)} required).`,
          },
          { status: 400 }
        );
      }

      masterPaymentRef = await nextReceiptNumber(admin, "REN-PAY");
      masterPaymentAmountSzl = term.feeSzl;
      const newBal = bal - term.feeSzl;

      // Conditional update — only if balance unchanged (optimistic concurrency)
      const { data: debited, error: debitErr } = await admin
        .from("operator_master_cards")
        .update({ balance_szl: newBal })
        .eq("id", card.id as string)
        .eq("balance_szl", bal)
        .select("id")
        .maybeSingle();

      if (debitErr || !debited) {
        return NextResponse.json(
          {
            error:
              "Could not debit master card (balance changed). Retry the payment.",
          },
          { status: 409 }
        );
      }

      await admin.from("operator_card_transactions").insert({
        id: `tx_ren_${Date.now()}_${plate.replace(/\s+/g, "").slice(0, 8)}`,
        card_id: card.id as string,
        timestamp: new Date().toISOString(),
        type: "PERMIT_RENEWAL_FEE",
        description: `Permit renewal fee for ${plate} (${input.termMonths} months)`,
        target_vehicle_reg: plate,
        category: "Permit Renewal",
        amount_szl: term.feeSzl,
        direction: "DEBIT",
        receipt_number: masterPaymentRef,
        status: "Completed",
      });
    }

    const renewal = await createRenewalRequest(
      {
        vehicleReg: plate,
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

    await writeAudit(admin, {
      action: "permit.approve",
      actorId: session.authUserId,
      actorRole: session.role,
      actorName: session.fullName,
      entityType: "renewal",
      entityId: plate,
      summary: `Submitted renewal for ${plate}`,
      meta: { masterPaymentRef: masterPaymentRef ?? null },
    });

    return NextResponse.json({ success: true, renewal });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
