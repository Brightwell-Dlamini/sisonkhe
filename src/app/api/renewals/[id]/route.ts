/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { approveRenewalSchema } from "@/lib/renewals/validation";
import { getRenewalById, approveRenewal } from "@/lib/renewals/queries";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VIEW_ROLES = [
  "super-admin",
  "admin",
  "fleet-manager",
  "operator",
] as const;
const APPROVE_ROLES = ["super-admin", "fleet-manager", "admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  const session = await requireServerRole([...VIEW_ROLES]);
  const { id } = await ctx.params;
  const renewal = await getRenewalById(id, session);
  if (!renewal) throw AppError.notFound("Renewal");
  return ok({ renewal });
});

export const PATCH = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  const session = await requireServerRole([...APPROVE_ROLES]);
  const { id } = await ctx.params;

  const body = await request.json();
  const parsed = approveRenewalSchema.safeParse(body);
  if (!parsed.success) {
    throw AppError.validation("Validation failed", {
      issues: parsed.error.flatten().fieldErrors,
    });
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
    { fullName: session.fullName, authUserId: session.authUserId }
  );

  if (!result.success) {
    throw AppError.validation(result.error ?? "Renewal decision failed");
  }

  return ok({
    success: true,
    note:
      parsed.data.decision === "Approved"
        ? "Approved. Print A4 + QR, then POST /api/print/permit/{reg} to unlock rank load."
        : undefined,
  });
});
