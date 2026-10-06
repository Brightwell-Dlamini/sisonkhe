/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/register/driver — identity collection only (marshal-style fields).
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { selfRegisterDriverSchema } from "@/lib/drivers/selfRegister";
import { generateDriverId } from "@/lib/drivers/generators";
import { rateLimit } from "@/lib/domain/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rl = rateLimit(`reg-driver:${ip}`, 15, 15 * 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many registrations. Try again later." },
        { status: 429 }
      );
    }

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
    const fullName = `${input.firstName} ${input.surname}`.trim();
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
              "A driver with that phone already exists. Claim your account at rollout or contact admin.",
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
              "A driver with that National ID already exists. Claim your account or contact admin.",
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
    const avatarSeed = fullName
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .slice(0, 12);

    const { error: insertErr } = await admin.from("drivers").insert({
      id: driverId,
      full_name: fullName,
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
      profile_picture_url: input.profilePictureUrl?.startsWith("data:")
        ? null
        : input.profilePictureUrl || null,
      status: "Active",
    });

    if (insertErr) {
      return NextResponse.json(
        { error: `Could not save driver profile: ${insertErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      driverId,
      fullName,
      nationalId: input.nationalId,
      message:
        "Profile saved. No login was created. Claim your account later or an admin will issue credentials.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
