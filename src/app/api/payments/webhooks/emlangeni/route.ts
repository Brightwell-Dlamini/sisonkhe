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
import { logWebhookEvent } from "@/lib/payments/webhookEvents";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";
import { log } from "@/lib/observability/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async (request: NextRequest) => {
  assertWebhookSecret(request, "EMLANGENI_WEBHOOK_SECRET");

  try {
    const body = await request.json();
    const parsed = emlangeniProvider.parseWebhook?.(body);
    if (!parsed) {
      log.warn("webhook.emlangeni.unparseable");
      void logWebhookEvent({
        providerId: "emlangeni",
        providerReference: null,
        status: null,
        outcome: "unparseable",
        applied: false,
        rawPayload: body && typeof body === "object" ? (body as Record<string, unknown>) : null,
      });
      return ok({ ignored: true });
    }

    log.info("webhook.emlangeni.received", {
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
      providerId: "emlangeni",
      providerReference: parsed.providerReference,
      status: parsed.status,
      outcome,
      applied: result.applied,
      rawPayload: parsed.rawPayload ?? null,
    });

    log.info("webhook.emlangeni.applied", {
      referenceId: parsed.providerReference,
      status: parsed.status,
      applied: result.applied,
    });

    return ok({ received: true, applied: result.applied });
  } catch (err) {
    if (err instanceof AppError) throw err;
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error("webhook.emlangeni.apply_failed", { err: message });
    void logWebhookEvent({
      providerId: "emlangeni",
      providerReference: null,
      status: null,
      outcome: "error",
      applied: false,
      errorMessage: message,
    });
    return ok({ received: true });
  }
});

export const GET = withApiHandler(async () => ok({ status: "ok" }));
