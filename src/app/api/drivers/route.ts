/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  /api/drivers — list (admin + inspector read), paginated
 * POST /api/drivers — create driver + auth account (admin only)
 */

import type { NextRequest } from "next/server";
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
import { normalizePlate } from "@/lib/domain/identity";
import { writeAudit } from "@/lib/domain/audit";
import { claimUsername, isUsernameTaken } from "@/lib/domain/usernames";
import { provisionAuthUser } from "@/lib/auth/provision";
import { parsePageParams, buildPageMeta } from "@/lib/pagination";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WRITE_ROLES = ["super-admin", "admin", "fleet-manager"] as const;
const LIST_ROLES = ["super-admin", "admin", "fleet-manager", "inspector"] as const;

async function generateUniqueUsername(fullName: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const taken = new Set<string>();
  try {
    const { data } = await admin.from("usernames").select("username").limit(5000);
    for (const r of data ?? []) {
      if (r.username) taken.add(String(r.username).toLowerCase());
    }
  } catch {
    /* */
  }
  return generateUsername(fullName, taken).toLowerCase();
}

export const GET = withApiHandler(async (request: NextRequest) => {
  const user = await requireServerRole([...LIST_ROLES]);
  const { page, limit, offset } = parsePageParams(request.nextUrl.searchParams, {
    limit: 100,
    maxLimit: 500,
  });

  const regionScope =
    user.role === "inspector" ? null : regionScopeOrThrow(user);
  const drivers = await listDrivers(regionScope, { limit, offset });
  const meta = buildPageMeta(
    offset + drivers.length + (drivers.length === limit ? limit : 0),
    page,
    limit
  );

  return ok(
    {
      drivers,
      regionScope,
      readOnly: user.role === "inspector",
    },
    { meta }
  );
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const user = await requireServerRole([...WRITE_ROLES]);
  regionScopeOrThrow(user);

  const body = await request.json();
  const parsed = createDriverSchema.safeParse(body);
  if (!parsed.success) {
    throw AppError.validation("Validation failed", {
      issues: parsed.error.flatten().fieldErrors,
    });
  }

  const input = parsed.data;
  const admin = createSupabaseAdminClient();
  const plate = input.assignedVehicleReg
    ? normalizePlate(input.assignedVehicleReg)
    : null;

  if (input.phone) {
    const { data: phoneClash } = await admin
      .from("drivers")
      .select("id")
      .eq("phone", input.phone)
      .maybeSingle();
    if (phoneClash) {
      throw AppError.conflict("A driver with that phone number already exists.");
    }
  }

  if (input.nationalId) {
    const { data: idClash } = await admin
      .from("drivers")
      .select("id")
      .eq("national_id", input.nationalId)
      .maybeSingle();
    if (idClash) {
      throw AppError.conflict("A driver with that National ID already exists.");
    }
  }

  if (input.licenseNumber) {
    const { data: licClash } = await admin
      .from("drivers")
      .select("id")
      .eq("license_number", input.licenseNumber)
      .maybeSingle();
    if (licClash) {
      throw AppError.conflict(
        "A driver with that licence number already exists."
      );
    }
  }

  if (plate) {
    const { data: vehicle } = await admin
      .from("vehicles")
      .select("registration_number, driver_id")
      .eq("registration_number", plate)
      .maybeSingle();

    if (!vehicle) throw AppError.notFound(`Vehicle ${plate}`);
  }

  const driverId = generateDriverId();
  const username = await generateUniqueUsername(input.fullName);
  if (await isUsernameTaken(admin, username)) {
    throw AppError.conflict("Generated username collided — retry.");
  }

  const tempPassword = generateTempPassword();
  const syntheticEmail = `${driverId}@driver.sisonkhe.local`;

  const avatarSeed = input.fullName
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, 12);

  const { authUserId } = await provisionAuthUser({
    email: syntheticEmail,
    password: tempPassword,
    role: "driver",
    userMetadata: {
      username,
      full_name: input.fullName,
      driver_id: driverId,
      must_change_password: true,
    },
    insertRoleRow: async (createdAuthUserId) => {
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
        assigned_vehicle_reg: null,
        auth_user_id: createdAuthUserId,
        avatar_seed: avatarSeed,
        profile_picture_url: input.profilePictureUrl || null,
        status: input.status,
        claimed_at: new Date().toISOString(),
      });

      if (insertErr) {
        throw new Error(`driver insert failed: ${insertErr.message}`);
      }
    },
  });

  await claimUsername(admin, username, authUserId, "driver");

  let assignmentWarning: string | null = null;
  if (plate) {
    try {
      await assignDriverVehicle(admin, {
        driverId,
        vehicleReg: plate,
        force: false,
      });
    } catch (linkErr) {
      assignmentWarning =
        linkErr instanceof Error
          ? linkErr.message
          : "Vehicle assignment failed — driver created unassigned.";
    }
  }

  await writeAudit(admin, {
    action: "driver.create",
    actorId: user.authUserId,
    actorRole: user.role,
    actorName: user.fullName,
    entityType: "driver",
    entityId: driverId,
    summary: `Registered driver ${input.fullName}`,
    meta: assignmentWarning ? { assignmentWarning } : null,
  });

  return ok(
    {
      success: true,
      driverId,
      assignmentWarning,
      credentials: {
        username,
        password: tempPassword,
        mustChangePassword: true,
      },
    },
    { status: 201 }
  );
});
