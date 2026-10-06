/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/register/driver — public driver data collection.
 *
 * Creates ONLY the driver row. No auth user. No password.
 *
 * Claiming happens later at rollout via /api/auth/claim/driver, which
 * creates the auth user and links it to the pre-existing row.
 *
 * This is the "collect first, claim later" pattern, matching marshals.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { selfRegisterDriverSchema } from "@/lib/drivers/selfRegister";
import { generateDriverId } from "@/lib/drivers/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = selfRegisterDriverSchema.safeParse(body);

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

    {
      const { data: clash } = await admin
        .from("drivers")
        .select("id")
        .eq("phone", input.phone)
        .maybeSingle();
      if (clash) {
        return NextResponse.json(
          {
            error:
              "A driver with that phone number already exists. Sign in or contact admin.",
          },
          { status: 409 }
        );
      }
    }

    {
      const { data: clash } = await admin
        .from("drivers")
        .select("id")
        .eq("national_id", input.nationalId)
        .maybeSingle();
      if (clash) {
        return NextResponse.json(
          {
            error:
              "A driver with that National ID already exists. Sign in or contact admin.",
          },
          { status: 409 }
        );
      }
    }

    if (input.licenseNumber) {
      const { data: clash } = await admin
        .from("drivers")
        .select("id")
        .eq("license_number", input.licenseNumber)
        .maybeSingle();
      if (clash) {
        return NextResponse.json(
          { error: "A driver with that licence number already exists." },
          { status: 409 }
        );
      }
    }

    const driverId = generateDriverId();
    const avatarSeed = input.fullName
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .slice(0, 12);

    const { error: insertErr } = await admin.from("drivers").insert({
      id: driverId,
      full_name: input.fullName,
      national_id: input.nationalId,
      phone: input.phone,
      residential_address: input.residentialAddress || null,
      date_of_birth: input.dateOfBirth || null,
      gender: input.gender || null,
      license_number: input.licenseNumber || null,
      license_class: input.licenseClass || null,
      pdp_number: input.pdpNumber || null,
      pdp_issue_date: input.pdpIssueDate || null,
      pdp_expiry_date: input.pdpExpiryDate || null,
      pdp_issuing_authority: input.pdpIssuingAuthority || null,
      pdp_status: input.pdpExpiryDate ? "Valid" : null,
      emergency_contact_name: input.emergencyContactName || null,
      emergency_contact_phone: input.emergencyContactPhone || null,
      emergency_contact_relation: input.emergencyContactRelation || null,
      assigned_vehicle_reg: null,
      auth_user_id: null,
      avatar_seed: avatarSeed,
      profile_picture_url: null,
      status: "Active",
      // claimed_at stays NULL — this row is not yet claimable by anyone.
    });

    if (insertErr) {
      console.error("[api/register/driver] insert error:", insertErr);
      return NextResponse.json(
        { error: `Could not save driver profile: ${insertErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      driverId,
      fullName: input.fullName,
      nationalId: input.nationalId,
      message:
        "Data collected. You will claim your account at rollout. " +
        "Register your vehicle with the same National ID to link it.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/register/driver] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
