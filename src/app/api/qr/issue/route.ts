/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/qr/issue
 *
 * Body: { registrationNumber: string }
 *
 * Staff-only. Issues a freshly-signed QR token for a vehicle. The token
 * embeds the current permit state at issue time. Verification re-checks the
 * live database, so an out-of-date token will still fail if the permit is
 * suspended afterward.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { signVehicleQr } from "@/lib/qr/sign";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

export async function POST(request: NextRequest) {
  try {
    await requireServerRole([...ALLOWED_ROLES]);

    const body = await request.json();
    const registrationNumber = String(body.registrationNumber ?? "")
      .trim()
      .toUpperCase();

    if (!registrationNumber) {
      return NextResponse.json(
        { error: "registrationNumber is required" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Could not read vehicle." },
        { status: 500 }
      );
    }

    if (!vehicle) {
      return NextResponse.json(
        { error: `Vehicle ${registrationNumber} not found.` },
        { status: 404 }
      );
    }

    const token = await signVehicleQr({
      registrationNumber: vehicle.registration_number as string,
      vic: (vehicle.vic as string | null) ?? null,
      permitNumber: (vehicle.permit_number as string | null) ?? null,
      permitStatus: (vehicle.permit_status as string | null) ?? null,
      permitExpiryDate: (vehicle.permit_expiry_date as string | null) ?? null,
    });

    return NextResponse.json({
      token,
      registrationNumber: vehicle.registration_number,
      issuedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
        ? 403
        : 500;
    console.error("[api/qr/issue] error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
