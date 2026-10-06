/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getServerSession, requireServerRole } from "@/lib/auth/session";
import { regionScopeOrThrow } from "@/lib/auth/permissions";
import { createVehicleSchema } from "@/lib/vehicles/validation";
import { listVehicles } from "@/lib/vehicles/queries";
import { assignDriverVehicle } from "@/lib/assignments/service";
import { normalizePlate } from "@/lib/domain/identity";
import { issueVehicleVirtualCard } from "@/lib/domain/vehicleCard";
import { writeAudit } from "@/lib/domain/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

function generateVIC(reg: string): string {
  if (!reg) return "";
  const cleanReg = reg.toUpperCase().replace(/\s+/g, "");
  const lettersOnly = cleanReg.replace(/[^A-Z]/g, "");
  const digitsOnly = cleanReg.replace(/[^0-9]/g, "");

  let prefix = "";
  if (cleanReg.startsWith("MSD") || cleanReg.includes("MZ")) prefix = "MMZ";
  else if (cleanReg.startsWith("HSD") || cleanReg.includes("BM")) prefix = "HBM";
  else if (cleanReg.startsWith("LSD") || cleanReg.includes("LU")) prefix = "SLU";
  else if (cleanReg.startsWith("SSD") || cleanReg.includes("SH")) prefix = "SNH";
  else if (lettersOnly.length >= 3) {
    prefix = `${lettersOnly.charAt(0)}${lettersOnly.slice(-2)}`;
  } else if (lettersOnly.length > 0) {
    prefix = (lettersOnly + "MZ").slice(0, 3);
  } else {
    prefix = "MMZ";
  }

  const digits =
    digitsOnly.length > 0 ? digitsOnly.padStart(3, "0").slice(-3) : "001";

  return `${prefix}-${digits}`;
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    if (session.role === "operator") {
      if (!session.operatorId) {
        return NextResponse.json({ vehicles: [] });
      }

      const admin = createSupabaseAdminClient();
      const { data, error } = await admin
        .from("vehicles")
        .select(
          `registration_number, vic, make, model, seating_capacity, classification,
           owner_name, owner_phone, owner_operator_id, driver_id, status,
           permit_number, permit_status, permit_issue_date, permit_expiry_date,
           cof_number, cof_issue_date, cof_expiry_date, created_at, updated_at`
        )
        .eq("owner_operator_id", session.operatorId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to list operator vehicles: ${error.message}`);
      }

      const vehicles = (data ?? []).map((row) => ({
        registrationNumber: row.registration_number as string,
        vic: (row.vic as string | null) ?? null,
        make: row.make as string,
        model: row.model as string,
        seatingCapacity: row.seating_capacity as number,
        classification: row.classification as string,
        ownerName: (row.owner_name as string | null) ?? null,
        ownerPhone: (row.owner_phone as string | null) ?? null,
        ownerOperatorId: (row.owner_operator_id as string | null) ?? null,
        driverId: (row.driver_id as string | null) ?? null,
        status: row.status as string,
        permitNumber: (row.permit_number as string | null) ?? null,
        permitStatus: (row.permit_status as string | null) ?? null,
        permitIssueDate: (row.permit_issue_date as string | null) ?? null,
        permitExpiryDate: (row.permit_expiry_date as string | null) ?? null,
        cofNumber: (row.cof_number as string | null) ?? null,
        cofIssueDate: (row.cof_issue_date as string | null) ?? null,
        cofExpiryDate: (row.cof_expiry_date as string | null) ?? null,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      }));

      return NextResponse.json({ vehicles });
    }

    if (!ADMIN_ROLES.includes(session.role as (typeof ADMIN_ROLES)[number])) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const regionScope = regionScopeOrThrow(session);
    const vehicles = await listVehicles(regionScope);
    return NextResponse.json({ vehicles, regionScope });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN" || message === "REGION_REQUIRED"
          ? 403
          : 500;
    console.error("[api/vehicles] GET error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireServerRole([...ADMIN_ROLES]);

    const body = await request.json();
    const parsed = createVehicleSchema.safeParse(body);

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
    const plate = normalizePlate(input.registrationNumber);

    const { data: existing } = await admin
      .from("vehicles")
      .select("registration_number")
      .eq("registration_number", plate)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Vehicle ${plate} is already registered.` },
        { status: 409 }
      );
    }

    // Compact-plate collision (HSD101BM vs HSD 101 BM)
    const compact = plate.replace(/\s+/g, "");
    const { data: allPlates } = await admin
      .from("vehicles")
      .select("registration_number")
      .limit(8000);
    const clash = (allPlates ?? []).find(
      (r) =>
        String(r.registration_number)
          .toUpperCase()
          .replace(/\s+/g, "") === compact
    );
    if (clash) {
      return NextResponse.json(
        {
          error: `Plate conflicts with existing ${clash.registration_number}. Use the canonical plate already registered.`,
        },
        { status: 409 }
      );
    }

    if (input.routeAssignmentId) {
      const { data: route } = await admin
        .from("routes")
        .select("id")
        .eq("id", input.routeAssignmentId)
        .maybeSingle();
      if (!route) {
        return NextResponse.json(
          { error: `Route ${input.routeAssignmentId} not found.` },
          { status: 404 }
        );
      }
    }

    let vic = input.vic ? normalizePlate(input.vic).replace(/\s+/g, "-") : generateVIC(plate);

    // VIC uniqueness
    const { data: vicClash } = await admin
      .from("vehicles")
      .select("registration_number")
      .eq("vic", vic)
      .maybeSingle();
    if (vicClash) {
      vic = `${vic}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    }

    const { error: insertErr } = await admin.from("vehicles").insert({
      registration_number: plate,
      vic,
      make: input.make,
      model: input.model,
      seating_capacity: input.seatingCapacity,
      classification: input.classification,
      route_assignment_id: input.routeAssignmentId || null,
      loading_bay: input.loadingBay || null,
      owner_name: input.ownerName || null,
      owner_phone: input.ownerPhone || null,
      owner_operator_id: input.ownerOperatorId || null,
      driver_id: null,
      status: "Waiting",
      current_queue_position: 0,
      permit_number: input.permitNumber || null,
      permit_status: input.permitStatus || "Active",
      permit_issue_date: input.permitIssueDate || null,
      permit_expiry_date: input.permitExpiryDate || null,
      cof_number: input.cofNumber || null,
      cof_issue_date: input.cofIssueDate || null,
      cof_expiry_date: input.cofExpiryDate || null,
      last_inspection_date: input.lastInspectionDate || null,
      association: input.association || null,
      insurance_expiry: input.insuranceExpiry || null,
      roadworthiness_expiry: input.roadworthinessExpiry || null,
      is_mid_month_addition: input.isMidMonthAddition ?? false,
      registration_date: new Date().toISOString().split("T")[0],
      month_registered: input.monthRegistered || null,
      mid_month_join_day: input.midMonthJoinDay ?? null,
      monthly_sequence_base_index: input.monthlySequenceBaseIndex ?? null,
    });

    if (insertErr) {
      console.error("[api/vehicles] insert error:", insertErr);
      return NextResponse.json(
        { error: `Could not create vehicle: ${insertErr.message}` },
        { status: 500 }
      );
    }

    let assignmentWarning: string | null = null;
    if (input.driverNationalId || input.driverId) {
      try {
        await assignDriverVehicle(admin, {
          driverId: input.driverId || null,
          nationalId: input.driverNationalId || null,
          vehicleReg: plate,
          force: false,
        });
      } catch (linkErr) {
        assignmentWarning =
          linkErr instanceof Error
            ? linkErr.message
            : "Driver assignment failed — vehicle created unassigned.";
      }
    }

    // Money truth: balance 0, fee unpaid until settlement
    await issueVehicleVirtualCard(admin, {
      registrationNumber: plate,
      vic,
      cardholderName: input.ownerName || "Fleet Operator",
      registrationFeePaid: false,
      registrationFeeAmount: 450,
    });

    await writeAudit(admin, {
      action: "vehicle.create",
      actorId: session.id,
      actorRole: session.role,
      actorName: session.fullName,
      entityType: "vehicle",
      entityId: plate,
      summary: `Registered vehicle ${plate} (VIC ${vic})`,
      after: { plate, vic, routeAssignmentId: input.routeAssignmentId ?? null },
      meta: assignmentWarning ? { assignmentWarning } : null,
    });

    return NextResponse.json({
      success: true,
      registrationNumber: plate,
      vic,
      assignmentWarning,
      card: { balanceSzl: 0, registrationFeePaid: false },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    console.error("[api/vehicles] POST error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
