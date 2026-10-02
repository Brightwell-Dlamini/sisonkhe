/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST   /api/assignments  — link driver ↔ vehicle
 * DELETE /api/assignments  — unlink
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import {
  assignDriverVehicle,
  unassignDriverVehicle,
} from "@/lib/assignments/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STAFF = new Set(["super-admin", "admin", "fleet-manager"]);

const postSchema = z.object({
  nationalId: z.string().trim().min(1).max(40).optional().or(z.literal("")),
  driverId: z.string().trim().min(1).max(60).optional().or(z.literal("")),
  vehicleReg: z.string().trim().min(3).max(20),
  force: z.boolean().optional().default(false),
});

const deleteSchema = z.object({
  nationalId: z.string().trim().min(1).max(40).optional().or(z.literal("")),
  driverId: z.string().trim().min(1).max(60).optional().or(z.literal("")),
  vehicleReg: z.string().trim().min(3).max(20).optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const session = await getServerSession();
    const isStaff = session ? STAFF.has(session.role) : false;
    const force = Boolean(parsed.data.force) && isStaff;

    if (!isStaff && !parsed.data.nationalId) {
      return NextResponse.json(
        { error: "National ID is required to link from the public form." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const result = await assignDriverVehicle(admin, {
      driverId: parsed.data.driverId || null,
      nationalId: parsed.data.nationalId || null,
      vehicleReg: parsed.data.vehicleReg,
      force,
    });

    return NextResponse.json({ success: true, assignment: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      typeof err === "object" && err && "status" in err
        ? Number((err as { status: number }).status)
        : 500;
    console.error("[api/assignments] POST:", err);
    return NextResponse.json({ error: message }, { status: status || 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    const isStaff = session ? STAFF.has(session.role) : false;

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      /* empty */
    }
    const { searchParams } = new URL(request.url);
    const merged = {
      nationalId:
        (body as { nationalId?: string }).nationalId ||
        searchParams.get("nationalId") ||
        "",
      driverId:
        (body as { driverId?: string }).driverId ||
        searchParams.get("driverId") ||
        "",
      vehicleReg:
        (body as { vehicleReg?: string }).vehicleReg ||
        searchParams.get("vehicleReg") ||
        "",
    };

    const parsed = deleteSchema.safeParse(merged);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Provide vehicleReg and/or nationalId / driverId" },
        { status: 400 }
      );
    }

    if (!isStaff && !parsed.data.nationalId) {
      return NextResponse.json(
        { error: "National ID required to unlink without staff session." },
        { status: 401 }
      );
    }

    const admin = createSupabaseAdminClient();
    const result = await unassignDriverVehicle(admin, {
      driverId: parsed.data.driverId || null,
      nationalId: parsed.data.nationalId || null,
      vehicleReg: parsed.data.vehicleReg || null,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      typeof err === "object" && err && "status" in err
        ? Number((err as { status: number }).status)
        : 500;
    console.error("[api/assignments] DELETE:", err);
    return NextResponse.json({ error: message }, { status: status || 500 });
  }
}
