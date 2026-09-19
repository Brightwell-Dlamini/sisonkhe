/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET    /api/vehicles/[reg]  — fetch one
 * PATCH  /api/vehicles/[reg]  — update
 * DELETE /api/vehicles/[reg]  — deactivate (soft)
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { updateVehicleSchema } from "@/lib/vehicles/validation";
import { getVehicleByReg } from "@/lib/vehicles/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

interface Params {
  params: Promise<{ reg: string }>;
}

function errorStatus(message: string): number {
  if (message === "UNAUTHENTICATED") return 401;
  if (message === "FORBIDDEN") return 403;
  if (message.includes("not found")) return 404;
  return 500;
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireServerRole([...ALLOWED_ROLES]);
    const { reg } = await params;
    const decoded = decodeURIComponent(reg);
    const vehicle = await getVehicleByReg(decoded);
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    return NextResponse.json({ vehicle });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/vehicles/[reg]] GET error:", err);
    return NextResponse.json(
      { error: message },
      { status: errorStatus(message) }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireServerRole([...ALLOWED_ROLES]);
    const { reg } = await params;
    const decoded = decodeURIComponent(reg).toUpperCase();

    const body = await request.json();
    const parsed = updateVehicleSchema.safeParse(body);

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
    const input = parsed.data;

    // --- Current state ---
    const { data: current } = await admin
      .from("vehicles")
      .select("driver_id, route_assignment_id")
      .eq("registration_number", decoded)
      .maybeSingle();

    if (!current) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const oldDriverId = current.driver_id as string | null;
    const newDriverId =
      input.driverId !== undefined ? input.driverId || null : oldDriverId;

    // --- Validate new driver ---
    if (input.driverId !== undefined && newDriverId !== oldDriverId) {
      if (newDriverId) {
        const { data: driver } = await admin
          .from("drivers")
          .select("id, assigned_vehicle_reg")
          .eq("id", newDriverId)
          .maybeSingle();

        if (!driver) {
          return NextResponse.json(
            { error: "Driver not found." },
            { status: 404 }
          );
        }
        if (
          driver.assigned_vehicle_reg &&
          driver.assigned_vehicle_reg !== decoded
        ) {
          return NextResponse.json(
            {
              error: `Driver is already assigned to ${driver.assigned_vehicle_reg}.`,
            },
            { status: 409 }
          );
        }
      }
    }

    // --- Build patch ---
    const patch: Record<string, unknown> = {};
    if (input.make !== undefined) patch.make = input.make;
    if (input.model !== undefined) patch.model = input.model;
    if (input.seatingCapacity !== undefined)
      patch.seating_capacity = input.seatingCapacity;
    if (input.classification !== undefined)
      patch.classification = input.classification;
    if (input.routeAssignmentId !== undefined)
      patch.route_assignment_id = input.routeAssignmentId || null;
    if (input.loadingBay !== undefined)
      patch.loading_bay = input.loadingBay || null;
    if (input.ownerName !== undefined)
      patch.owner_name = input.ownerName || null;
    if (input.ownerPhone !== undefined)
      patch.owner_phone = input.ownerPhone || null;
    if (input.ownerOperatorId !== undefined)
      patch.owner_operator_id = input.ownerOperatorId || null;
    if (input.driverId !== undefined) patch.driver_id = newDriverId;
    if (input.permitNumber !== undefined)
      patch.permit_number = input.permitNumber || null;
    if (input.permitStatus !== undefined)
      patch.permit_status = input.permitStatus || null;
    if (input.permitIssueDate !== undefined)
      patch.permit_issue_date = input.permitIssueDate || null;
    if (input.permitExpiryDate !== undefined)
      patch.permit_expiry_date = input.permitExpiryDate || null;
    if (input.cofNumber !== undefined)
      patch.cof_number = input.cofNumber || null;
    if (input.cofIssueDate !== undefined)
      patch.cof_issue_date = input.cofIssueDate || null;
    if (input.cofExpiryDate !== undefined)
      patch.cof_expiry_date = input.cofExpiryDate || null;
    if (input.lastInspectionDate !== undefined)
      patch.last_inspection_date = input.lastInspectionDate || null;
    if (input.association !== undefined)
      patch.association = input.association || null;
    if (input.insuranceExpiry !== undefined)
      patch.insurance_expiry = input.insuranceExpiry || null;
    if (input.roadworthinessExpiry !== undefined)
      patch.roadworthiness_expiry = input.roadworthinessExpiry || null;
    if (input.isMidMonthAddition !== undefined)
      patch.is_mid_month_addition = input.isMidMonthAddition;
    if (input.monthRegistered !== undefined)
      patch.month_registered = input.monthRegistered || null;
    if (input.midMonthJoinDay !== undefined)
      patch.mid_month_join_day = input.midMonthJoinDay ?? null;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { error: updateErr } = await admin
      .from("vehicles")
      .update(patch)
      .eq("registration_number", decoded);

    if (updateErr) {
      console.error("[api/vehicles/[reg]] update error:", updateErr);
      return NextResponse.json(
        { error: `Update failed: ${updateErr.message}` },
        { status: 500 }
      );
    }

    // --- Sync driver assignment ---
    if (input.driverId !== undefined && newDriverId !== oldDriverId) {
      // Detach old driver
      if (oldDriverId) {
        await admin
          .from("drivers")
          .update({ assigned_vehicle_reg: null })
          .eq("id", oldDriverId);
      }
      // Attach new driver
      if (newDriverId) {
        await admin
          .from("drivers")
          .update({ assigned_vehicle_reg: decoded })
          .eq("id", newDriverId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/vehicles/[reg]] PATCH error:", err);
    return NextResponse.json(
      { error: message },
      { status: errorStatus(message) }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await requireServerRole([...ALLOWED_ROLES]);
    const { reg } = await params;
    const decoded = decodeURIComponent(reg).toUpperCase();

    const admin = createSupabaseAdminClient();

    // Detach any assigned driver
    const { data: vehicle } = await admin
      .from("vehicles")
      .select("driver_id")
      .eq("registration_number", decoded)
      .maybeSingle();

    if (vehicle?.driver_id) {
      await admin
        .from("drivers")
        .update({ assigned_vehicle_reg: null })
        .eq("id", vehicle.driver_id);
    }

    // Soft delete: mark Offline and unassign
    const { error } = await admin
      .from("vehicles")
      .update({
        status: "Offline",
        driver_id: null,
        current_queue_position: 0,
      })
      .eq("registration_number", decoded);

    if (error) {
      return NextResponse.json(
        { error: `Deactivate failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/vehicles/[reg]] DELETE error:", err);
    return NextResponse.json(
      { error: message },
      { status: errorStatus(message) }
    );
  }
}
