/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Staff-only assignment API (auth required via middleware).
 * Public self-service register uses /api/public/* if needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import {
  assignDriverVehicle,
  unassignDriverVehicle,
} from "@/lib/assignments/service";
import { rateLimit } from "@/lib/domain/rateLimit";

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
    const session = await getServerSession();
    if (!session || !STAFF.has(session.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const rl = rateLimit(`assign:${session.authUserId}`, 30, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many assignment attempts. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // force only for staff (already gated) — still must be explicit true
    const force = parsed.data.force === true;

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
    return NextResponse.json({ error: message }, { status: status || 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !STAFF.has(session.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

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
    return NextResponse.json({ error: message }, { status: status || 500 });
  }
}
