/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/qr/issue — staff-only signed QR for vehicle | operator | driver.
 *
 * Body:
 *   { type?: "vehicle"|"operator"|"driver", registrationNumber? | operatorId? | driverId? }
 * Default type: vehicle (registrationNumber required).
 */

import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import {
  signVehicleQr,
  signOperatorQr,
  signDriverQr,
} from "@/lib/qr/sign";
import { buildQrVerifyUrl } from "@/lib/appUrl";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

export const POST = withApiHandler(async (request: NextRequest) => {
  await requireServerRole([...ALLOWED_ROLES]);

  const body = await request.json();
  const type = String(body.type ?? "vehicle").toLowerCase();
  const admin = createSupabaseAdminClient();

  if (type === "vehicle") {
    const registrationNumber = String(body.registrationNumber ?? "")
      .trim()
      .toUpperCase();
    if (!registrationNumber) {
      throw AppError.validation("registrationNumber is required for vehicle QR");
    }

    const { data: vehicle, error } = await admin
      .from("vehicles")
      .select(
        "registration_number, vic, permit_number, permit_status, permit_expiry_date"
      )
      .eq("registration_number", registrationNumber)
      .maybeSingle();

    if (error) {
      console.error("[api/qr/issue] vehicle db error:", error);
      throw AppError.internal("Could not read vehicle.");
    }
    if (!vehicle) throw AppError.notFound(`Vehicle ${registrationNumber}`);

    const token = await signVehicleQr({
      registrationNumber: vehicle.registration_number as string,
      vic: (vehicle.vic as string | null) ?? null,
      permitNumber: (vehicle.permit_number as string | null) ?? null,
      permitStatus: (vehicle.permit_status as string | null) ?? null,
      permitExpiryDate: (vehicle.permit_expiry_date as string | null) ?? null,
    });

    return ok({
      type: "vehicle",
      token,
      verifyUrl: buildQrVerifyUrl(token),
      registrationNumber: vehicle.registration_number,
      issuedAt: new Date().toISOString(),
    });
  }

  if (type === "operator") {
    const operatorId = String(body.operatorId ?? "").trim();
    if (!operatorId) {
      throw AppError.validation("operatorId is required for operator QR");
    }

    const { data: op, error } = await admin
      .from("fleet_operators")
      .select("id, name, operator_license_number")
      .eq("id", operatorId)
      .maybeSingle();

    if (error) throw AppError.internal("Could not read operator.");
    if (!op) throw AppError.notFound(`Operator ${operatorId}`);

    const token = await signOperatorQr({
      id: op.id as string,
      name: op.name as string,
      operatorLicenseNumber:
        (op.operator_license_number as string | null) ?? null,
    });

    return ok({
      type: "operator",
      token,
      verifyUrl: buildQrVerifyUrl(token),
      operatorId: op.id,
      issuedAt: new Date().toISOString(),
    });
  }

  if (type === "driver") {
    const driverId = String(body.driverId ?? "").trim();
    if (!driverId) {
      throw AppError.validation("driverId is required for driver QR");
    }

    const { data: driver, error } = await admin
      .from("drivers")
      .select("id, full_name, pdp_status, pdp_expiry_date")
      .eq("id", driverId)
      .maybeSingle();

    if (error) throw AppError.internal("Could not read driver.");
    if (!driver) throw AppError.notFound(`Driver ${driverId}`);

    const token = await signDriverQr({
      id: driver.id as string,
      fullName: driver.full_name as string,
      pdpStatus: (driver.pdp_status as string | null) ?? null,
      pdpExpiryDate: (driver.pdp_expiry_date as string | null) ?? null,
    });

    return ok({
      type: "driver",
      token,
      verifyUrl: buildQrVerifyUrl(token),
      driverId: driver.id,
      issuedAt: new Date().toISOString(),
    });
  }

  throw AppError.validation('type must be "vehicle", "operator", or "driver"');
});
