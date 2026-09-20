/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JSON permit data — for external integrations and testing.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { buildPermitDocument } from "@/lib/printing/permit";

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
  const reg = decodeURIComponent(registrationNumber).toUpperCase();
  const doc = await buildPermitDocument(reg);

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ permit: doc });
}
