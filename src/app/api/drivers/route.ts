/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  /api/drivers  — list all drivers (staff only)
 * POST /api/drivers  — create a new driver (staff only)
 *
 * On create:
 *   1. Validates input
 *   2. Checks uniqueness (phone, national ID, licence)
 *   3. Validates vehicle assignment if provided
 *   4. Generates driver ID, username, and temp password
 *   5. Creates the auth user (synthetic email)
 *   6. Inserts the driver row
 *   7. Links the vehicle back to the driver
 *   8. Returns the generated credentials ONCE
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { createDriverSchema } from "@/lib/drivers/validation";
import { listDrivers } from "@/lib/drivers/queries";
import {
  generateDriverId,
  generateTempPassword,
  generateUsername,
} from "@/lib/drivers/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

// ---------------------------------------------------------------------------
// GET — list all drivers
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    await requireServerRole([...ALLOWED_ROLES]);
    const drivers = await listDrivers();
    return NextResponse.json({ drivers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
        ? 403
        : 500;
    console.error("[api/drivers] GET error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// ---------------------------------------------------------------------------
// POST — create a new driver
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let createdAuthUserId: string | null = null;

  try {
    await requireServerRole([...ALLOWED_ROLES]);

    // --- Parse & validate input --------------------------------------------
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

    // --- Uniqueness checks -------------------------------------------------
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

    // --- Vehicle assignment validation -------------------------------------
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
      if (vehicle.driver_id) {
        return NextResponse.json(
          {
            error: `Vehicle ${input.assignedVehicleReg} is already assigned to another driver.`,
          },
          { status: 409 }
        );
      }
    }

    // --- Generate credentials ----------------------------------------------
    const driverId = generateDriverId();
    const username = await generateUniqueUsername(input.fullName);
    const tempPassword = generateTempPassword();
    const syntheticEmail = `${driverId}@driver.sisonkhe.local`;

    // --- Create auth user --------------------------------------------------
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

    // --- Insert driver row -------------------------------------------------
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
    });

    if (insertErr) {
      // Rollback auth user
      await admin.auth.admin.deleteUser(createdAuthUserId);
      createdAuthUserId = null;
      console.error("[api/drivers] insert error:", insertErr);
      return NextResponse.json(
        { error: `Could not create driver record: ${insertErr.message}` },
        { status: 500 }
      );
    }

    // --- Link vehicle back to driver ---------------------------------------
    if (input.assignedVehicleReg) {
      const { error: linkErr } = await admin
        .from("vehicles")
        .update({ driver_id: driverId })
        .eq("registration_number", input.assignedVehicleReg);

      if (linkErr) {
        // Non-fatal: driver is created, vehicle link failed.
        // Log and continue — admin can re-assign via edit.
        console.warn(
          "[api/drivers] vehicle link failed (non-fatal):",
          linkErr
        );
      }
    }

    // --- Success -----------------------------------------------------------
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
        : message === "FORBIDDEN"
        ? 403
        : 500;

    // Rollback auth user on catastrophic failure
    if (createdAuthUserId) {
      try {
        const admin = createSupabaseAdminClient();
        await admin.auth.admin.deleteUser(createdAuthUserId);
        console.log("[api/drivers] rolled back auth user:", createdAuthUserId);
      } catch (rollbackErr) {
        console.error("[api/drivers] rollback failed:", rollbackErr);
      }
    }

    console.error("[api/drivers] POST error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// ---------------------------------------------------------------------------
// Helper — generate a unique username from the driver's full name
// ---------------------------------------------------------------------------

async function generateUniqueUsername(fullName: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const taken = new Set<string>();

  // Preload existing usernames (up to 1000 — enough for the pilot)
  try {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of data?.users ?? []) {
      const uname = u.user_metadata?.username as string | undefined;
      if (uname) taken.add(uname.toLowerCase());
    }
  } catch (err) {
    // Non-fatal: we fall back to collision-resistant suffix generation
    console.warn("[api/drivers] could not preload usernames:", err);
  }

  return generateUsername(fullName, taken).toLowerCase();
}
