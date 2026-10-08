/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * e-Mlangeni webhook. Requires EMLANGENI_WEBHOOK_SECRET.
 */

import type { NextRequest } from "next/server";
import { applyProviderStatus } from "@/lib/payments/intent";
import { emlangeniProvider } from "@/lib/payments/providers/emlangeni";
import { assertWebhookSecret } from "@/lib/payments/webhookAuth";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async (request: NextRequest) => {
  assertWebhookSecret(request, "EMLANGENI_WEBHOOK_SECRET");

  try {
    const body = await request.json();
    const parsed = emlangeniProvider.parseWebhook?.(body);
    if (!parsed) return ok({ ignored: true });

    await applyProviderStatus(
      parsed.providerReference,
      parsed.status,
      parsed.failureReason,
      parsed.rawPayload
    );

    return ok({ received: true });
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[webhook/emlangeni] error:", err);
    return ok({ received: true });
  }
});

export const GET = withApiHandler(async () => ok({ status: "ok" }));
