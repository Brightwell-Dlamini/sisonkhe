/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/qr/issue — staff-only signed vehicle QR.
 */

import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { signVehicleQr } from "@/lib/qr/sign";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

export const POST = withApiHandler(async (request: NextRequest) => {
  await requireServerRole([...ALLOWED_ROLES]);

  const body = await request.json();
  const registrationNumber = String(body.registrationNumber ?? "")
    .trim()
    .toUpperCase();

  if (!registrationNumber) {
    throw AppError.validation("registrationNumber is required");
  }

  const admin = createSupabaseAdminClient();
  const { data: vehicle, error } = await admin
    .from("vehicles")
    .select(
      "registration_number, vic, permit_number, permit_status, permit_expiry_date"
    )
    .eq("registration_number", registrationNumber)
    .maybeSingle();

  if (error) {
    console.error("[api/qr/issue] db error:", error);
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
    token,
    registrationNumber: vehicle.registration_number,
    issuedAt: new Date().toISOString(),
  });
});
