/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET   /api/renewals/[id]  — fetch one
 * PATCH /api/renewals/[id]  — approve or reject (staff only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { approveRenewalSchema } from "@/lib/renewals/validation";
import { getRenewalById, approveRenewal } from "@/lib/renewals/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VIEW_ROLES = ["super-admin", "admin", "fleet-manager", "operator"];
const APPROVE_ROLES = ["super-admin", "fleet-manager", "admin"];

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();
    if (!session || !VIEW_ROLES.includes(session.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const renewal = await getRenewalById(id, session);
    if (!renewal) {
      return NextResponse.json({ error: "Renewal not found." }, { status: 404 });
    }

    return NextResponse.json({ renewal });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/renewals/[id]] GET error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();
    if (!session || !APPROVE_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "Only fleet managers and admins can process renewals." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = approveRenewalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await approveRenewal(
      id,
      {
        decision: parsed.data.decision,
        newPermitNumber: parsed.data.newPermitNumber || undefined,
        permitIssueDate: parsed.data.permitIssueDate || undefined,
        permitExpiryDate: parsed.data.permitExpiryDate || undefined,
        cofNumber: parsed.data.cofNumber || undefined,
        cofIssueDate: parsed.data.cofIssueDate || undefined,
        cofExpiryDate: parsed.data.cofExpiryDate || undefined,
        inspectionDate: parsed.data.inspectionDate || undefined,
        licensingOffice: parsed.data.licensingOffice || undefined,
        renewalNotes: parsed.data.renewalNotes || undefined,
      },
      { fullName: session.fullName }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/renewals/[id]] PATCH error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
