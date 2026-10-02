/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/register/driver — public self-registration.
 * Creates auth user + drivers row in one step. Account is Active immediately.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { selfRegisterDriverSchema } from "@/lib/drivers/selfRegister";
import {
  generateDriverId,
  generateUsername,
} from "@/lib/drivers/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let createdAuthUserId: string | null = null;

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

    // Uniqueness: phone
    {
      const { data: clash } = await admin
        .from("drivers")
        .select("id")
        .eq("phone", input.phone)
        .maybeSingle();
      if (clash) {
        return NextResponse.json(
          { error: "A driver with that phone number already exists. Sign in or contact admin." },
          { status: 409 }
        );
      }
    }

    // Uniqueness: national ID
    {
      const { data: clash } = await admin
        .from("drivers")
        .select("id")
        .eq("national_id", input.nationalId)
        .maybeSingle();
      if (clash) {
        return NextResponse.json(
          { error: "A driver with that National ID already exists. Sign in or contact admin." },
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
    const username = await generateUniqueUsername(input.fullName);
    const syntheticEmail = `${driverId}@driver.sisonkhe.local`;

    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email: syntheticEmail,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          username,
          full_name: input.fullName,
          role: "driver",
          driver_id: driverId,
        },
      });

    if (createErr || !created.user) {
      console.error("[api/register/driver] createUser error:", createErr);
      return NextResponse.json(
        {
          error: `Could not create account: ${createErr?.message ?? "Unknown error"}`,
        },
        { status: 500 }
      );
    }

    createdAuthUserId = created.user.id;

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
      auth_user_id: createdAuthUserId,
      avatar_seed: avatarSeed,
      profile_picture_url: null,
      status: "Active",
    });

    if (insertErr) {
      await admin.auth.admin.deleteUser(createdAuthUserId);
      createdAuthUserId = null;
      console.error("[api/register/driver] insert error:", insertErr);
      return NextResponse.json(
        { error: `Could not save driver profile: ${insertErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      driverId,
      username,
      fullName: input.fullName,
      nationalId: input.nationalId,
      message:
        "Registration complete. Sign in with your username and password. Register your vehicle with the same National ID to link it.",
    });
  } catch (err) {
    if (createdAuthUserId) {
      try {
        const admin = createSupabaseAdminClient();
        await admin.auth.admin.deleteUser(createdAuthUserId);
      } catch {
        /* ignore rollback errors */
      }
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/register/driver] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function generateUniqueUsername(fullName: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const taken = new Set<string>();

  try {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of data?.users ?? []) {
      const uname = u.user_metadata?.username as string | undefined;
      if (uname) taken.add(uname.toLowerCase());
    }
  } catch (err) {
    console.warn("[api/register/driver] could not preload usernames:", err);
  }

  return generateUsername(fullName, taken).toLowerCase();
}
