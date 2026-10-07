/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { createRenewalSchema, RENEWAL_TERMS } from "@/lib/renewals/validation";
import {
  createRenewalRequest,
  listRenewals,
  type RenewalRow,
} from "@/lib/renewals/queries";
import { normalizePlate } from "@/lib/domain/identity";
import { nextReceiptNumber } from "@/lib/domain/serials";
import { writeAudit } from "@/lib/domain/audit";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VIEW_ROLES = [
  "super-admin",
  "admin",
  "fleet-manager",
  "operator",
] as const;

export const GET = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole([...VIEW_ROLES]);
  const statusParam = request.nextUrl.searchParams.get("status");
  const status = statusParam
    ? (statusParam as RenewalRow["status"])
    : undefined;
  const renewals = await listRenewals(session, { status });
  return ok({ renewals });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole(["operator"]);
  if (!session.operatorId) {
    throw AppError.forbidden("Only fleet operators can submit renewal requests.");
  }

  const body = await request.json();
  const parsed = createRenewalSchema.safeParse(body);
  if (!parsed.success) {
    throw AppError.validation("Validation failed", {
      issues: parsed.error.flatten().fieldErrors,
    });
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

  if (!vehicle) throw AppError.notFound(`Vehicle ${plate}`);

  if (vehicle.owner_operator_id !== session.operatorId) {
    throw AppError.forbidden("You do not own this vehicle.");
  }

  if (vehicle.status === "Loading" || vehicle.status === "Departed") {
    throw AppError.conflict(
      `Vehicle is ${vehicle.status}. Return to Waiting before submitting a renewal.`
    );
  }

  const { data: existing } = await admin
    .from("permit_renewal_requests")
    .select("id")
    .eq("vehicle_reg", plate)
    .in("status", ["Pending Admin Approval", "Approved"])
    .maybeSingle();

  if (existing) {
    throw AppError.conflict(
      `An open renewal already exists for ${plate} (pending or approved awaiting print).`
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
    if (!term) throw AppError.validation("Invalid term.");

    const { data: card } = await admin
      .from("operator_master_cards")
      .select("id, balance_szl, status")
      .eq("operator_id", session.operatorId)
      .maybeSingle();

    if (!card) throw AppError.notFound("Master card");
    if (card.status !== "Active") {
      throw AppError.validation("Master card is frozen.");
    }

    const bal = Number(card.balance_szl);
    if (bal < term.feeSzl) {
      throw AppError.validation(
        `Insufficient master card balance (E${bal.toFixed(2)} available, E${term.feeSzl.toFixed(2)} required).`
      );
    }

    masterPaymentRef = await nextReceiptNumber(admin, "REN-PAY");
    masterPaymentAmountSzl = term.feeSzl;
    const newBal = bal - term.feeSzl;

    const { data: debited, error: debitErr } = await admin
      .from("operator_master_cards")
      .update({ balance_szl: newBal })
      .eq("id", card.id as string)
      .eq("balance_szl", bal)
      .select("id")
      .maybeSingle();

    if (debitErr || !debited) {
      throw AppError.conflict(
        "Could not debit master card (balance changed). Retry the payment."
      );
    }

    const txToken = randomBytes(6).toString("hex");
    await admin.from("operator_card_transactions").insert({
      id: `tx_ren_${txToken}_${plate.replace(/\s+/g, "").slice(0, 8)}`,
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
    action: "permit.submit",
    actorId: session.authUserId,
    actorRole: session.role,
    actorName: session.fullName,
    entityType: "renewal",
    entityId: plate,
    summary: `Submitted renewal for ${plate}`,
    meta: { masterPaymentRef: masterPaymentRef ?? null },
  });

  return ok({ success: true, renewal }, { status: 201 });
});
