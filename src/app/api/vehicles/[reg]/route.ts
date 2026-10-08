/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { updateVehicleSchema } from "@/lib/vehicles/validation";
import { getVehicleByReg } from "@/lib/vehicles/queries";
import {
  assignDriverVehicle,
  unassignDriverVehicle,
} from "@/lib/assignments/service";
import {
  canChangeRoute,
  canChangeOperatorOwnership,
} from "@/lib/domain/permitLifecycle";
import { normalizePlate } from "@/lib/domain/identity";
import { writeAudit } from "@/lib/domain/audit";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

type Ctx = { params: Promise<{ reg: string }> };

function mapAssignError(message: string): AppError {
  if (message.includes("not found")) return AppError.notFound(message);
  if (
    message.includes("already") ||
    message.includes("suspended") ||
    message.includes("PDP") ||
    message.includes("Cannot") ||
    message.includes("force") ||
    message.includes("assignment")
  ) {
    return AppError.conflict(message);
  }
  if (message.includes("RPC is not installed")) {
    return new AppError("INTERNAL", message, { expose: false });
  }
  return AppError.internal(message);
}

export const GET = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  await requireServerRole([...ALLOWED_ROLES]);
  const { reg } = await ctx.params;
  const vehicle = await getVehicleByReg(decodeURIComponent(reg));
  if (!vehicle) throw AppError.notFound("Vehicle");
  return ok({ vehicle });
});

export const PATCH = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  const session = await requireServerRole([...ALLOWED_ROLES]);
  const { reg } = await ctx.params;
  const decoded = normalizePlate(decodeURIComponent(reg));

  const body = await request.json();
  const parsed = updateVehicleSchema.safeParse(body);
  if (!parsed.success) {
    throw AppError.validation("Validation failed", {
      issues: parsed.error.flatten().fieldErrors,
    });
  }

  const admin = createSupabaseAdminClient();
  const input = parsed.data;

  const { data: current } = await admin
    .from("vehicles")
    .select("driver_id, status, route_assignment_id, owner_operator_id")
    .eq("registration_number", decoded)
    .maybeSingle();

  if (!current) throw AppError.notFound("Vehicle");

  const oldDriverId = current.driver_id as string | null;
  const vehicleStatus = current.status as string | null;
  const driverChange = input.driverId !== undefined;
  const newDriverId = driverChange ? input.driverId || null : oldDriverId;

  if (
    input.routeAssignmentId !== undefined &&
    input.routeAssignmentId !== current.route_assignment_id
  ) {
    const gate = canChangeRoute(vehicleStatus);
    if (!gate.allowed) throw AppError.conflict(gate.reason ?? "Route change blocked");
  }

  if (
    input.ownerOperatorId !== undefined &&
    input.ownerOperatorId !== current.owner_operator_id
  ) {
    const gate = canChangeOperatorOwnership(vehicleStatus, !!oldDriverId);
    if (!gate.allowed) {
      throw AppError.conflict(gate.reason ?? "Ownership change blocked");
    }
  }

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
  if (input.ownerName !== undefined) patch.owner_name = input.ownerName || null;
  if (input.ownerPhone !== undefined)
    patch.owner_phone = input.ownerPhone || null;
  if (input.ownerOperatorId !== undefined)
    patch.owner_operator_id = input.ownerOperatorId || null;
  if (input.permitNumber !== undefined)
    patch.permit_number = input.permitNumber || null;
  if (input.permitStatus !== undefined)
    patch.permit_status = input.permitStatus || null;
  if (input.permitIssueDate !== undefined)
    patch.permit_issue_date = input.permitIssueDate || null;
  if (input.permitExpiryDate !== undefined)
    patch.permit_expiry_date = input.permitExpiryDate || null;
  if (input.cofNumber !== undefined) patch.cof_number = input.cofNumber || null;
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

  if (Object.keys(patch).length > 0) {
    const { error: updateErr } = await admin
      .from("vehicles")
      .update(patch)
      .eq("registration_number", decoded);

    if (updateErr) {
      throw AppError.internal(`Update failed: ${updateErr.message}`);
    }
  }

  if (driverChange && newDriverId !== oldDriverId) {
    try {
      if (!newDriverId) {
        await unassignDriverVehicle(admin, {
          vehicleReg: decoded,
          driverId: oldDriverId,
        });
      } else {
        await assignDriverVehicle(admin, {
          driverId: newDriverId,
          vehicleReg: decoded,
          force: true,
        });
      }
    } catch (assignErr) {
      const message =
        assignErr instanceof Error ? assignErr.message : "Assignment failed";
      throw mapAssignError(message);
    }
  }

  if (Object.keys(patch).length === 0 && !driverChange) {
    throw AppError.validation("No fields to update");
  }

  await writeAudit(admin, {
    action: "vehicle.update",
    actorId: session.authUserId,
    actorRole: session.role,
    actorName: session.fullName,
    entityType: "vehicle",
    entityId: decoded,
    summary: `Updated vehicle ${decoded}`,
    after: patch,
  });

  return ok({ success: true });
});

export const DELETE = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  const session = await requireServerRole([...ALLOWED_ROLES]);
  const { reg } = await ctx.params;
  const decoded = normalizePlate(decodeURIComponent(reg));

  const admin = createSupabaseAdminClient();

  const { data: vehicle } = await admin
    .from("vehicles")
    .select("driver_id, status")
    .eq("registration_number", decoded)
    .maybeSingle();

  if (!vehicle) throw AppError.notFound("Vehicle");

  if (vehicle.status === "Loading" || vehicle.status === "Departed") {
    throw AppError.conflict(
      `Cannot deactivate while ${vehicle.status}. Reset to Waiting first.`
    );
  }

  if (vehicle.driver_id) {
    try {
      await unassignDriverVehicle(admin, {
        vehicleReg: decoded,
        driverId: vehicle.driver_id as string,
      });
    } catch (unErr) {
      const msg =
        unErr instanceof Error ? unErr.message : "Unlink driver failed";
      throw mapAssignError(msg);
    }
  }

  const { error } = await admin
    .from("vehicles")
    .update({
      status: "Offline",
      current_queue_position: 0,
    })
    .eq("registration_number", decoded);

  if (error) {
    throw AppError.internal(`Deactivate failed: ${error.message}`);
  }

  await writeAudit(admin, {
    action: "vehicle.deactivate",
    actorId: session.authUserId,
    actorRole: session.role,
    actorName: session.fullName,
    entityType: "vehicle",
    entityId: decoded,
    summary: `Deactivated vehicle ${decoded}`,
  });

  return ok({ success: true });
});
