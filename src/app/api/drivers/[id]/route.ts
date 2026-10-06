/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET    /api/drivers/[id]  — fetch one driver
 * PATCH  /api/drivers/[id]  — update driver
 * DELETE /api/drivers/[id]  — deactivate (soft) + unlink vehicle
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { updateDriverSchema } from "@/lib/drivers/validation";
import { assignDriverVehicle, unassignDriverVehicle } from "@/lib/assignments/service";
import { getDriverById } from "@/lib/drivers/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

interface Params {
  params: Promise<{ id: string }>;
}

function errorStatus(message: string): number {
  if (message === "UNAUTHENTICATED") return 401;
  if (message === "FORBIDDEN") return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("already") || message.includes("suspended") || message.includes("PDP"))
    return 409;
  return 500;
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireServerRole([...ALLOWED_ROLES]);
    const { id } = await params;
    const driver = await getDriverById(id);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }
    return NextResponse.json({ driver });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/drivers/[id]] GET error:", err);
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireServerRole([...ALLOWED_ROLES]);
    const { id } = await params;

    const body = await request.json();
    const parsed = updateDriverSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const patch: Record<string, unknown> = {};
    const input = parsed.data;

    if (input.fullName !== undefined) patch.full_name = input.fullName;
    if (input.nationalId !== undefined)
      patch.national_id = input.nationalId || null;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.residentialAddress !== undefined)
      patch.residential_address = input.residentialAddress || null;
    if (input.dateOfBirth !== undefined)
      patch.date_of_birth = input.dateOfBirth || null;
    if (input.gender !== undefined) patch.gender = input.gender || null;
    if (input.licenseNumber !== undefined)
      patch.license_number = input.licenseNumber || null;
    if (input.licenseClass !== undefined)
      patch.license_class = input.licenseClass || null;
    if (input.pdpNumber !== undefined) patch.pdp_number = input.pdpNumber || null;
    if (input.pdpIssueDate !== undefined)
      patch.pdp_issue_date = input.pdpIssueDate || null;
    if (input.pdpExpiryDate !== undefined)
      patch.pdp_expiry_date = input.pdpExpiryDate || null;
    if (input.pdpIssuingAuthority !== undefined)
      patch.pdp_issuing_authority = input.pdpIssuingAuthority || null;
    if (input.pdpStatus !== undefined)
      patch.pdp_status = input.pdpStatus || null;
    if (input.emergencyContactName !== undefined)
      patch.emergency_contact_name = input.emergencyContactName || null;
    if (input.emergencyContactPhone !== undefined)
      patch.emergency_contact_phone = input.emergencyContactPhone || null;
    if (input.emergencyContactRelation !== undefined)
      patch.emergency_contact_relation = input.emergencyContactRelation || null;
    if (input.assignedVehicleReg !== undefined)
      patch.assigned_vehicle_reg = input.assignedVehicleReg || null;
    if (input.status !== undefined) patch.status = input.status;
    if (input.profilePictureUrl !== undefined)
      patch.profile_picture_url = input.profilePictureUrl || null;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data: current } = await admin
      .from("drivers")
      .select("assigned_vehicle_reg")
      .eq("id", id)
      .maybeSingle();

    if (!current) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const oldVehicle = current.assigned_vehicle_reg as string | null;
    const newVehicle = patch.assigned_vehicle_reg as string | null | undefined;
    const suspending = input.status === "Suspended";

    // Suspended driver cannot keep a vehicle
    if (suspending && oldVehicle) {
      await unassignDriverVehicle(admin, {
        driverId: id,
        vehicleReg: oldVehicle,
      });
      patch.assigned_vehicle_reg = null;
    }

    if (newVehicle && newVehicle !== oldVehicle && !suspending) {
      const { data: vehicle } = await admin
        .from("vehicles")
        .select("registration_number, driver_id")
        .eq("registration_number", newVehicle)
        .maybeSingle();

      if (!vehicle) {
        return NextResponse.json(
          { error: `Vehicle ${newVehicle} not found.` },
          { status: 404 }
        );
      }
    }

    const { data: updated, error: updateErr } = await admin
      .from("drivers")
      .update(patch)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (updateErr) {
      return NextResponse.json(
        { error: `Update failed: ${updateErr.message}` },
        { status: 500 }
      );
    }
    if (!updated) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    if (!suspending && newVehicle !== undefined && newVehicle !== oldVehicle) {
      if (!newVehicle && oldVehicle) {
        await unassignDriverVehicle(admin, { driverId: id, vehicleReg: oldVehicle });
      } else if (newVehicle) {
        await assignDriverVehicle(admin, {
          driverId: id,
          vehicleReg: newVehicle,
          force: true,
        });
      }
    }

    if (input.fullName !== undefined && updated.auth_user_id) {
      try {
        const { data: existing } = await admin.auth.admin.getUserById(
          updated.auth_user_id
        );
        await admin.auth.admin.updateUserById(updated.auth_user_id, {
          user_metadata: {
            ...(existing?.user?.user_metadata ?? {}),
            full_name: input.fullName,
          },
        });
      } catch (metaErr) {
        console.warn("[api/drivers/[id]] metadata sync failed:", metaErr);
      }
    }

    return NextResponse.json({
      success: true,
      unlinkedVehicle: suspending ? oldVehicle : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/drivers/[id]] PATCH error:", err);
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await requireServerRole([...ALLOWED_ROLES]);
    const { id } = await params;

    const admin = createSupabaseAdminClient();

    const { data: driverRow } = await admin
      .from("drivers")
      .select("assigned_vehicle_reg")
      .eq("id", id)
      .maybeSingle();

    if (driverRow?.assigned_vehicle_reg) {
      await unassignDriverVehicle(admin, {
        driverId: id,
        vehicleReg: driverRow.assigned_vehicle_reg as string,
      });
    }

    const { error } = await admin
      .from("drivers")
      .update({
        status: "Suspended",
        assigned_vehicle_reg: null,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: `Deactivate failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      unlinkedVehicle: (driverRow?.assigned_vehicle_reg as string) ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/drivers/[id]] DELETE error:", err);
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}
