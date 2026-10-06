/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  — permit document JSON
 * POST — mark approved renewal as Printed (lifts rank load block)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { buildPermitDocument } from "@/lib/printing/permit";
import { markRenewalPrinted } from "@/lib/renewals/queries";
import { normalizePlate } from "@/lib/domain/identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"];

interface Params {
  params: Promise<{ registrationNumber: string }>;
}

export async function GET(_: NextRequest, { params }: Params) {
  const session = await getServerSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { registrationNumber } = await params;
  const reg = normalizePlate(decodeURIComponent(registrationNumber));
  const doc = await buildPermitDocument(reg);

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ permit: doc });
}

export async function POST(_: NextRequest, { params }: Params) {
  const session = await getServerSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { registrationNumber } = await params;
  const reg = normalizePlate(decodeURIComponent(registrationNumber));

  const result = await markRenewalPrinted(reg, {
    fullName: session.fullName,
    authUserId: session.authUserId,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    marked: result.marked ?? 0,
    message:
      (result.marked ?? 0) > 0
        ? "Permit marked printed. Rank load is unlocked."
        : "No approved renewal pending print for this vehicle.",
  });
}
