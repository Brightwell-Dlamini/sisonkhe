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
import { logWebhookEvent } from "@/lib/payments/webhookEvents";
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
        keys:
          body && typeof body === "object"
            ? Object.keys(body as object).slice(0, 12).join(",")
            : "n/a",
      });
      void logWebhookEvent({
        providerId: "momo",
        providerReference: null,
        status: null,
        outcome: "unparseable",
        applied: false,
        rawPayload: body && typeof body === "object" ? (body as Record<string, unknown>) : null,
      });
      return ok({ ignored: true });
    }

    log.info("webhook.momo.received", {
      referenceId: parsed.providerReference,
      status: parsed.status,
    });

    const result = await applyProviderStatus(
      parsed.providerReference,
      parsed.status,
      parsed.failureReason,
      parsed.rawPayload
    );

    const outcome = result.applied
      ? "applied"
      : result.intent
        ? "already_terminal"
        : "ignored";

    void logWebhookEvent({
      providerId: "momo",
      providerReference: parsed.providerReference,
      status: parsed.status,
      outcome,
      applied: result.applied,
      rawPayload: parsed.rawPayload ?? null,
    });

    log.info("webhook.momo.applied", {
      referenceId: parsed.providerReference,
      status: parsed.status,
      applied: result.applied,
    });

    return ok({ received: true, applied: result.applied });
  } catch (err) {
    if (err instanceof AppError) throw err;
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error("webhook.momo.apply_failed", { err: message });
    void logWebhookEvent({
      providerId: "momo",
      providerReference: null,
      status: null,
      outcome: "error",
      applied: false,
      errorMessage: message,
    });
    // Verified payload but apply failed — acknowledge to avoid infinite retries
    return ok({ received: true, error: message });
  }
});

export const GET = withApiHandler(async () => ok({ status: "ok" }));
