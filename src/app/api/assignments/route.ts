/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import {
  assignDriverVehicle,
  unassignDriverVehicle,
} from "@/lib/assignments/service";
import { rateLimitAsync } from "@/lib/domain/rateLimit";
import { writeAudit } from "@/lib/domain/audit";
import {
  notifyDriverById,
  notifyOperatorOfVehicle,
} from "@/lib/notifications/service";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STAFF = ["super-admin", "admin", "fleet-manager"] as const;

const postSchema = z.object({
  nationalId: z.string().trim().min(1).max(40).optional().or(z.literal("")),
  driverId: z.string().trim().min(1).max(60).optional().or(z.literal("")),
  vehicleReg: z.string().trim().min(3).max(20),
  force: z.boolean().optional().default(true),
});

const deleteSchema = z.object({
  nationalId: z.string().trim().min(1).max(40).optional().or(z.literal("")),
  driverId: z.string().trim().min(1).max(60).optional().or(z.literal("")),
  vehicleReg: z.string().trim().min(3).max(20).optional().or(z.literal("")),
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole([...STAFF]);

  const rl = await rateLimitAsync(`assign:${session.authUserId}`, 30, 60_000);
  if (!rl.ok) {
    throw new AppError("RATE_LIMITED", "Too many assignment attempts. Try again shortly.", {
      details: { retryAfterSec: rl.retryAfterSec },
    });
  }

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    throw AppError.validation("Validation failed", {
      issues: parsed.error.flatten().fieldErrors,
    });
  }

  const admin = createSupabaseAdminClient();
  const result = await assignDriverVehicle(admin, {
    driverId: parsed.data.driverId || null,
    nationalId: parsed.data.nationalId || null,
    vehicleReg: parsed.data.vehicleReg,
    force: true,
  });

  await writeAudit(admin, {
    action: "assignment.link",
    actorId: session.authUserId,
    actorRole: session.role,
    actorName: session.fullName,
    entityType: "driver",
    entityId: result.driverId,
    summary: `Linked ${result.driverName} → ${result.vehicleReg}`,
    after: result,
  });

  void notifyDriverById(result.driverId, {
    type: "assignment.link",
    title: "Vehicle assigned",
    message: `You are now assigned to ${result.vehicleReg}.`,
    href: "/driver",
    entityType: "vehicle",
    entityId: result.vehicleReg,
  });
  void notifyOperatorOfVehicle(result.vehicleReg, {
    type: "assignment.link",
    title: "Driver linked to vehicle",
    message: `${result.driverName} was assigned to ${result.vehicleReg}.`,
    href: "/operator",
    entityType: "vehicle",
    entityId: result.vehicleReg,
  });

  return ok({ assignment: result });
});

export const DELETE = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole([...STAFF]);

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    /* empty body ok — query params allowed */
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
    throw AppError.validation("Provide vehicleReg and/or nationalId / driverId");
  }

  const admin = createSupabaseAdminClient();
  const result = await unassignDriverVehicle(admin, {
    driverId: parsed.data.driverId || null,
    nationalId: parsed.data.nationalId || null,
    vehicleReg: parsed.data.vehicleReg || null,
  });

  await writeAudit(admin, {
    action: "assignment.unlink",
    actorId: session.authUserId,
    actorRole: session.role,
    actorName: session.fullName,
    entityType: "driver",
    entityId: result.driverId ?? "unknown",
    summary: `Unlinked driver ${result.driverId ?? "?"} from ${result.vehicleReg ?? "?"}`,
    after: result,
  });

  if (result.driverId) {
    void notifyDriverById(result.driverId, {
      type: "assignment.unlink",
      title: "Vehicle unlinked",
      message: result.vehicleReg
        ? `You were unlinked from ${result.vehicleReg}.`
        : "Your vehicle assignment was cleared.",
      href: "/driver",
      entityType: "vehicle",
      entityId: result.vehicleReg,
    });
  }
  if (result.vehicleReg) {
    void notifyOperatorOfVehicle(result.vehicleReg, {
      type: "assignment.unlink",
      title: "Driver removed from vehicle",
      message: `Driver was unlinked from ${result.vehicleReg}.`,
      href: "/operator",
      entityType: "vehicle",
      entityId: result.vehicleReg,
    });
  }

  return ok(result);
});
