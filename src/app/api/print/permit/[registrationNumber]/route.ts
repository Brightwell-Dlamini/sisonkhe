/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  — permit document JSON
 * POST — mark approved renewal as Printed
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { buildPermitDocument } from "@/lib/printing/permit";
import { markRenewalPrinted } from "@/lib/renewals/queries";
import { normalizePlate } from "@/lib/domain/identity";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

type Ctx = { params: Promise<{ registrationNumber: string }> };

export const GET = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  await requireServerRole([...ALLOWED_ROLES]);
  const { registrationNumber } = await ctx.params;
  const reg = normalizePlate(decodeURIComponent(registrationNumber));
  const doc = await buildPermitDocument(reg);
  if (!doc) throw AppError.notFound("Permit document");
  return ok({ permit: doc });
});

export const POST = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  const session = await requireServerRole([...ALLOWED_ROLES]);
  const { registrationNumber } = await ctx.params;
  const reg = normalizePlate(decodeURIComponent(registrationNumber));

  const result = await markRenewalPrinted(reg, {
    fullName: session.fullName,
    authUserId: session.authUserId,
  });

  if (!result.success) {
    throw AppError.validation(result.error ?? "Print mark failed");
  }

  return ok({
    success: true,
    marked: result.marked ?? 0,
    message:
      (result.marked ?? 0) > 0
        ? "Permit marked printed. Rank load is unlocked."
        : "No approved renewal pending print for this vehicle.",
  });
});
