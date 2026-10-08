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
      return ok({ ignored: true });
    }

    log.info("webhook.emlangeni.received", {
      referenceId: parsed.providerReference,
      status: parsed.status,
    });

    await applyProviderStatus(
      parsed.providerReference,
      parsed.status,
      parsed.failureReason,
      parsed.rawPayload
    );

    log.info("webhook.emlangeni.applied", {
      referenceId: parsed.providerReference,
      status: parsed.status,
    });

    return ok({ received: true });
  } catch (err) {
    if (err instanceof AppError) throw err;
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error("webhook.emlangeni.apply_failed", { err: message });
    return ok({ received: true });
  }
});

export const GET = withApiHandler(async () => ok({ status: "ok" }));
