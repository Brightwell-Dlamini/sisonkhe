/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/payments/intent — create
 * GET  /api/payments/intent — list caller's intents
 */

import type { NextRequest } from "next/server";
import { requireServerRole, requireServerSession } from "@/lib/auth/session";
import { createIntent, listIntentsForUser } from "@/lib/payments/intent";
import { listEnabledProviders, isLive } from "@/lib/payments/providers";
import type { PaymentPurpose, ProviderId } from "@/lib/payments/types";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = [
  "operator",
  "super-admin",
  "fleet-manager",
  "admin",
] as const;

export const GET = withApiHandler(async () => {
  const session = await requireServerSession();
  const intents = await listIntentsForUser(session.authUserId, 50);
  const providers = listEnabledProviders().map((p) => ({
    id: p.id,
    displayName: p.displayName,
    requiresPayerPhone: p.requiresPayerPhone,
  }));
  return ok({ intents, providers, live: isLive() });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole([...ALLOWED_ROLES]);

  const body = await request.json();
  const providerId = String(body.providerId ?? "") as ProviderId;
  const amountSzl = Number(body.amountSzl ?? 0);
  const purpose = String(body.purpose ?? "") as PaymentPurpose;
  const targetEntityId = String(body.targetEntityId ?? "").trim();
  const payerPhone = body.payerPhone ? String(body.payerPhone) : undefined;
  const payerName = body.payerName ? String(body.payerName) : undefined;
  const description = body.description ? String(body.description) : undefined;

  if (!providerId || !purpose || !targetEntityId) {
    throw AppError.validation(
      "providerId, purpose, and targetEntityId are required"
    );
  }
  if (!Number.isFinite(amountSzl) || amountSzl <= 0) {
    throw AppError.validation("amountSzl must be a positive number");
  }

  // Operators may only target their own master card / own vehicles
  if (session.role === "operator") {
    if (!session.operatorId) {
      throw AppError.forbidden("Operator profile required");
    }
    if (purpose === "master_card_topup") {
      if (targetEntityId !== session.operatorId) {
        throw AppError.forbidden("Operators may only top up their own master card");
      }
    } else if (purpose === "vehicle_card_topup") {
      // Ownership is enforced downstream in transfer flows; for intents we
      // require the vehicle to belong to this operator when we can look it up.
      const { createSupabaseAdminClient } = await import("@/lib/supabase/server");
      const admin = createSupabaseAdminClient();
      const { data: vehicle } = await admin
        .from("vehicles")
        .select("owner_operator_id")
        .eq("registration_number", targetEntityId)
        .maybeSingle();
      if (!vehicle || vehicle.owner_operator_id !== session.operatorId) {
        throw AppError.forbidden("Operators may only top up their own vehicles");
      }
    } else {
      throw AppError.forbidden(`Operators cannot initiate purpose ${purpose}`);
    }
  }

  const result = await createIntent({
    providerId,
    amountSzl,
    purpose,
    targetEntityId,
    initiatedBy: session.authUserId,
    payerPhone,
    payerName,
    description,
  });

  if (result.error) {
    throw AppError.validation(result.error, { intent: result.intent });
  }

  return ok({ intent: result.intent }, { status: 201 });
});
