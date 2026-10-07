/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { updateDriverSchema } from "@/lib/drivers/validation";
import {
  assignDriverVehicle,
  unassignDriverVehicle,
} from "@/lib/assignments/service";
import { getDriverById } from "@/lib/drivers/queries";
import { normalizePlate } from "@/lib/domain/identity";
import { writeAudit } from "@/lib/domain/audit";
import {
  notifyDriverById,
  notifyOperatorOfVehicle,
} from "@/lib/notifications/service";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

type Ctx = { params: Promise<{ id: string }> };

function mapAssignError(message: string): AppError {
  if (message.includes("not found")) return AppError.notFound(message);
  if (
    message.includes("already") ||
    message.includes("suspended") ||
    message.includes("PDP") ||
    message.includes("cannot") ||
    message.includes("not available") ||
    message.includes("linked")
  ) {
    return AppError.conflict(message);
  }
  if (message.includes("RPC is not installed")) {
    return AppError.internal(message);
  }
  return AppError.internal(message);
}

export const GET = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  await requireServerRole([...ALLOWED_ROLES]);
  const { id } = await ctx.params;
  const driver = await getDriverById(id);
  if (!driver) throw AppError.notFound("Driver");
  return ok({ driver });
});

export const PATCH = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  const session = await requireServerRole([...ALLOWED_ROLES]);
  const { id } = await ctx.params;

  const body = await request.json();
  const parsed = updateDriverSchema.safeParse(body);
  if (!parsed.success) {
    throw AppError.validation("Validation failed", {
      issues: parsed.error.flatten().fieldErrors,
    });
  }

  const admin = createSupabaseAdminClient();
  const input = parsed.data;

  const patch: Record<string, unknown> = {};

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
  if (input.pdpStatus !== undefined) patch.pdp_status = input.pdpStatus || null;
  if (input.emergencyContactName !== undefined)
    patch.emergency_contact_name = input.emergencyContactName || null;
  if (input.emergencyContactPhone !== undefined)
    patch.emergency_contact_phone = input.emergencyContactPhone || null;
  if (input.emergencyContactRelation !== undefined)
    patch.emergency_contact_relation = input.emergencyContactRelation || null;
  if (input.status !== undefined) patch.status = input.status;
  if (input.profilePictureUrl !== undefined)
    patch.profile_picture_url = input.profilePictureUrl || null;

  const { data: current } = await admin
    .from("drivers")
    .select("assigned_vehicle_reg, status, full_name")
    .eq("id", id)
    .maybeSingle();

  if (!current) throw AppError.notFound("Driver");

  const oldVehicle = (current.assigned_vehicle_reg as string | null)
    ? normalizePlate(current.assigned_vehicle_reg as string)
    : null;
  const newVehicleRaw =
    input.assignedVehicleReg !== undefined
      ? input.assignedVehicleReg
        ? normalizePlate(input.assignedVehicleReg)
        : null
      : undefined;
  const suspending = input.status === "Suspended";

  let unlinkedVehicle: string | null = null;

  if (suspending && oldVehicle) {
    try {
      await unassignDriverVehicle(admin, {
        driverId: id,
        vehicleReg: oldVehicle,
      });
      unlinkedVehicle = oldVehicle;
    } catch (unErr) {
      const msg =
        unErr instanceof Error ? unErr.message : "Unlink on suspend failed";
      throw mapAssignError(msg);
    }
    await writeAudit(admin, {
      action: "assignment.unlink",
      actorId: session.authUserId,
      actorRole: session.role,
      actorName: session.fullName,
      entityType: "driver",
      entityId: id,
      summary: `Unlinked ${oldVehicle} on suspend of ${current.full_name}`,
    });
    void notifyDriverById(id, {
      type: "assignment.unlink",
      title: "Vehicle unlinked",
      message: `You were unlinked from ${oldVehicle} (account suspended).`,
      href: "/driver",
      entityType: "vehicle",
      entityId: oldVehicle,
    });
  }

  if (Object.keys(patch).length > 0) {
    const { error: updateErr } = await admin
      .from("drivers")
      .update(patch)
      .eq("id", id);

    if (updateErr) {
      throw AppError.internal(`Update failed: ${updateErr.message}`);
    }
  }

  if (!suspending && newVehicleRaw !== undefined && newVehicleRaw !== oldVehicle) {
    if (!newVehicleRaw && oldVehicle) {
      try {
        await unassignDriverVehicle(admin, {
          driverId: id,
          vehicleReg: oldVehicle,
        });
      } catch (unErr) {
        const msg = unErr instanceof Error ? unErr.message : "Unlink failed";
        throw mapAssignError(msg);
      }
      unlinkedVehicle = oldVehicle;
      await writeAudit(admin, {
        action: "assignment.unlink",
        actorId: session.authUserId,
        actorRole: session.role,
        actorName: session.fullName,
        entityType: "driver",
        entityId: id,
        summary: `Unlinked ${oldVehicle}`,
      });
      void notifyDriverById(id, {
        type: "assignment.unlink",
        title: "Vehicle unlinked",
        message: `You were unlinked from ${oldVehicle}.`,
        href: "/driver",
        entityType: "vehicle",
        entityId: oldVehicle,
      });
      void notifyOperatorOfVehicle(oldVehicle, {
        type: "assignment.unlink",
        title: "Driver removed",
        message: `Driver was unlinked from ${oldVehicle}.`,
        href: "/operator",
        entityType: "vehicle",
        entityId: oldVehicle,
      });
    } else if (newVehicleRaw) {
      try {
        await assignDriverVehicle(admin, {
          driverId: id,
          vehicleReg: newVehicleRaw,
          force: true,
        });
      } catch (assignErr) {
        const msg =
          assignErr instanceof Error ? assignErr.message : "Assignment failed";
        throw mapAssignError(msg);
      }
      await writeAudit(admin, {
        action: "assignment.link",
        actorId: session.authUserId,
        actorRole: session.role,
        actorName: session.fullName,
        entityType: "driver",
        entityId: id,
        summary: `Linked driver to ${newVehicleRaw}`,
        after: { vehicleReg: newVehicleRaw },
      });
      void notifyDriverById(id, {
        type: "assignment.link",
        title: "Vehicle assigned",
        message: `You are now assigned to ${newVehicleRaw}.`,
        href: "/driver",
        entityType: "vehicle",
        entityId: newVehicleRaw,
      });
      void notifyOperatorOfVehicle(newVehicleRaw, {
        type: "assignment.link",
        title: "Driver linked",
        message: `${current.full_name} assigned to ${newVehicleRaw}.`,
        href: "/operator",
        entityType: "vehicle",
        entityId: newVehicleRaw,
      });
    }
  }

  if (suspending) {
    await writeAudit(admin, {
      action: "driver.suspend",
      actorId: session.authUserId,
      actorRole: session.role,
      actorName: session.fullName,
      entityType: "driver",
      entityId: id,
      summary: `Suspended ${current.full_name}`,
      before: { status: current.status, vehicle: oldVehicle },
    });
    void notifyDriverById(id, {
      type: "system",
      title: "Account suspended",
      message: "Your driver account was suspended. Contact rank admin.",
      href: "/login",
      entityType: "driver",
      entityId: id,
    });
  } else if (Object.keys(patch).length > 0) {
    await writeAudit(admin, {
      action: "driver.update",
      actorId: session.authUserId,
      actorRole: session.role,
      actorName: session.fullName,
      entityType: "driver",
      entityId: id,
      summary: `Updated driver profile`,
      after: patch,
    });
  }

  if (input.fullName !== undefined) {
    const { data: updated } = await admin
      .from("drivers")
      .select("auth_user_id")
      .eq("id", id)
      .maybeSingle();
    if (updated?.auth_user_id) {
      try {
        const { data: existing } = await admin.auth.admin.getUserById(
          updated.auth_user_id as string
        );
        await admin.auth.admin.updateUserById(updated.auth_user_id as string, {
          user_metadata: {
            ...(existing?.user?.user_metadata ?? {}),
            full_name: input.fullName,
          },
        });
      } catch {
        /* non-fatal */
      }
    }
  }

  return ok({ success: true, unlinkedVehicle });
});

export const DELETE = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  const session = await requireServerRole([...ALLOWED_ROLES]);
  const { id } = await ctx.params;

  const admin = createSupabaseAdminClient();

  const { data: driverRow } = await admin
    .from("drivers")
    .select("assigned_vehicle_reg, full_name")
    .eq("id", id)
    .maybeSingle();

  if (driverRow?.assigned_vehicle_reg) {
    try {
      await unassignDriverVehicle(admin, {
        driverId: id,
        vehicleReg: driverRow.assigned_vehicle_reg as string,
      });
    } catch (unErr) {
      const msg =
        unErr instanceof Error ? unErr.message : "Unlink before suspend failed";
      throw mapAssignError(msg);
    }
  }

  const { error } = await admin
    .from("drivers")
    .update({ status: "Suspended" })
    .eq("id", id);

  if (error) {
    throw AppError.internal(`Suspend failed: ${error.message}`);
  }

  await writeAudit(admin, {
    action: "driver.suspend",
    actorId: session.authUserId,
    actorRole: session.role,
    actorName: session.fullName,
    entityType: "driver",
    entityId: id,
    summary: `Suspended (archive) ${driverRow?.full_name ?? id}`,
  });

  void notifyDriverById(id, {
    type: "system",
    title: "Account suspended",
    message: "Your driver account was suspended. Contact rank admin.",
    href: "/login",
    entityType: "driver",
    entityId: id,
  });

  return ok({
    success: true,
    action: "suspended",
    unlinkedVehicle: (driverRow?.assigned_vehicle_reg as string) ?? null,
  });
});
