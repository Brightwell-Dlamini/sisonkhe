/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MTN MoMo webhook. Requires MOMO_WEBHOOK_SECRET (Bearer / X-Webhook-Secret).
 * Returns 200 after successful verification so the provider does not retry.
 * Returns 401 on bad secret so misconfiguration is visible.
 */

import type { NextRequest } from "next/server";
import { applyProviderStatus } from "@/lib/payments/intent";
import { momoProvider } from "@/lib/payments/providers/momo";
import { assertWebhookSecret } from "@/lib/payments/webhookAuth";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";
import { log } from "@/lib/observability/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async (request: NextRequest) => {
  assertWebhookSecret(request, "MOMO_WEBHOOK_SECRET");

  try {
    const body = await request.json();
    const parsed = momoProvider.parseWebhook?.(body);
    if (!parsed) {
      log.warn("webhook.momo.unparseable", {
        keys: body && typeof body === "object" ? Object.keys(body as object).slice(0, 12).join(",") : "n/a",
      });
      return ok({ ignored: true });
    }

    log.info("webhook.momo.received", {
      referenceId: parsed.providerReference,
      status: parsed.status,
    });

    await applyProviderStatus(
      parsed.providerReference,
      parsed.status,
      parsed.failureReason,
      parsed.rawPayload
    );

    log.info("webhook.momo.applied", {
      referenceId: parsed.providerReference,
      status: parsed.status,
    });

    return ok({ received: true });
  } catch (err) {
    if (err instanceof AppError) throw err;
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error("webhook.momo.apply_failed", { err: message });
    // Verified payload but apply failed — acknowledge to avoid infinite retries
    return ok({ received: true, error: message });
  }
});

export const GET = withApiHandler(async () => ok({ status: "ok" }));
