/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  /api/payments/intent/[id] — fetch
 * POST /api/payments/intent/[id] — poll provider status
 */

import type { NextRequest } from "next/server";
import { requireServerSession } from "@/lib/auth/session";
import { getIntent, applyProviderStatus } from "@/lib/payments/intent";
import { getProvider } from "@/lib/payments/providers";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const TERMINAL = ["completed", "failed", "cancelled", "expired"];

export const GET = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  const session = await requireServerSession();
  const { id } = await ctx.params;
  const intent = await getIntent(id);
  if (!intent) throw AppError.notFound("Payment intent");

  const isOwner = intent.initiatedBy === session.authUserId;
  const isStaff = ["super-admin", "admin", "fleet-manager"].includes(
    session.role
  );
  if (!isOwner && !isStaff) throw AppError.forbidden();

  return ok({ intent });
});

export const POST = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  const session = await requireServerSession();
  const { id } = await ctx.params;
  const intent = await getIntent(id);
  if (!intent) throw AppError.notFound("Payment intent");

  if (intent.initiatedBy !== session.authUserId) {
    throw AppError.forbidden();
  }

  if (TERMINAL.includes(intent.status)) {
    return ok({ intent });
  }

  const provider = getProvider(intent.providerId);
  if (!provider || !intent.providerReference) {
    throw AppError.internal("Provider unavailable");
  }

  const result = await provider.checkStatus(intent.providerReference);

  if (TERMINAL.includes(result.status)) {
    const applied = await applyProviderStatus(
      intent.providerReference,
      result.status,
      result.failureReason,
      result.rawResponse
    );
    return ok({ intent: applied.intent ?? intent });
  }

  return ok({ intent });
});
