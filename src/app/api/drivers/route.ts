/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { regionScopeOrThrow } from "@/lib/auth/permissions";
import { createDriverSchema } from "@/lib/drivers/validation";
import { listDrivers } from "@/lib/drivers/queries";
import {
  generateDriverId,
  generateTempPassword,
  generateUsername,
} from "@/lib/drivers/generators";
import { assignDriverVehicle } from "@/lib/assignments/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

export async function GET() {
  try {
    const user = await requireServerRole([...ALLOWED_ROLES]);
    const regionScope = regionScopeOrThrow(user);
    const drivers = await listDrivers(regionScope);
    return NextResponse.json({ drivers, regionScope });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN" || message === "REGION_REQUIRED"
          ? 403
          : 500;
    console.error("[api/drivers] GET error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  let createdAuthUserId: string | null = null;

  try {
    const user = await requireServerRole([...ALLOWED_ROLES]);
    const regionScope = regionScopeOrThrow(user);

    const body = await request.json();
    const parsed = createDriverSchema.safeParse(body);

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

    if (input.phone) {
      const { data: phoneClash } = await admin
        .from("drivers")
        .select("id")
        .eq("phone", input.phone)
        .maybeSingle();
      if (phoneClash) {
        return NextResponse.json(
          { error: "A driver with that phone number already exists." },
          { status: 409 }
        );
      }
    }

    if (input.nationalId) {
      const { data: idClash } = await admin
        .from("drivers")
        .select("id")
        .eq("national_id", input.nationalId)
        .maybeSingle();
      if (idClash) {
        return NextResponse.json(
          { error: "A driver with that National ID already exists." },
          { status: 409 }
        );
      }
    }

    if (input.licenseNumber) {
      const { data: licClash } = await admin
        .from("drivers")
        .select("id")
        .eq("license_number", input.licenseNumber)
        .maybeSingle();
      if (licClash) {
        return NextResponse.json(
          { error: "A driver with that licence number already exists." },
          { status: 409 }
        );
      }
    }

    if (input.assignedVehicleReg) {
      const { data: vehicle } = await admin
        .from("vehicles")
        .select("registration_number, driver_id")
        .eq("registration_number", input.assignedVehicleReg)
        .maybeSingle();

      if (!vehicle) {
        return NextResponse.json(
          { error: `Vehicle ${input.assignedVehicleReg} not found.` },
          { status: 404 }
        );
      }
    }

    const driverId = generateDriverId();
    const username = await generateUniqueUsername(input.fullName);
    const tempPassword = generateTempPassword();
    const syntheticEmail = `${driverId}@driver.sisonkhe.local`;

    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email: syntheticEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          username,
          full_name: input.fullName,
          role: "driver",
          driver_id: driverId,
        },
      });

    if (createErr || !created.user) {
      console.error("[api/drivers] createUser error:", createErr);
      return NextResponse.json(
        {
          error: `Could not create driver account: ${
            createErr?.message ?? "Unknown error"
          }`,
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
      national_id: input.nationalId || null,
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
      pdp_status: input.pdpStatus || null,
      emergency_contact_name: input.emergencyContactName || null,
      emergency_contact_phone: input.emergencyContactPhone || null,
      emergency_contact_relation: input.emergencyContactRelation || null,
      assigned_vehicle_reg: input.assignedVehicleReg || null,
      auth_user_id: createdAuthUserId,
      avatar_seed: avatarSeed,
      profile_picture_url: input.profilePictureUrl || null,
      status: input.status,
      region: regionScope ?? null,
    });

    if (insertErr) {
      await admin.auth.admin.deleteUser(createdAuthUserId);
      createdAuthUserId = null;
      console.error("[api/drivers] insert error:", insertErr);
      return NextResponse.json(
        { error: `Could not create driver record: ${insertErr.message}` },
        { status: 500 }
      );
    }

    if (input.assignedVehicleReg) {
      try {
        await assignDriverVehicle(admin, {
          driverId,
          vehicleReg: input.assignedVehicleReg,
          force: true,
        });
      } catch (linkErr) {
        console.warn("[api/drivers] assignment failed (non-fatal):", linkErr);
      }
    }

    return NextResponse.json({
      success: true,
      driverId,
      credentials: {
        username,
        password: tempPassword,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN" || message === "REGION_REQUIRED"
          ? 403
          : 500;

    if (createdAuthUserId) {
      try {
        const admin = createSupabaseAdminClient();
        await admin.auth.admin.deleteUser(createdAuthUserId);
      } catch (rollbackErr) {
        console.error("[api/drivers] rollback failed:", rollbackErr);
      }
    }

    console.error("[api/drivers] POST error:", err);
    return NextResponse.json({ error: message }, { status });
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
    console.warn("[api/drivers] could not preload usernames:", err);
  }
  return generateUsername(fullName, taken).toLowerCase();
}
