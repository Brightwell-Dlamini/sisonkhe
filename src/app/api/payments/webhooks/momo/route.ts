/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MTN MoMo webhook. Always 200 so provider does not retry on our bugs.
 */

import type { NextRequest } from "next/server";
import { applyProviderStatus } from "@/lib/payments/intent";
import { momoProvider } from "@/lib/payments/providers/momo";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const parsed = momoProvider.parseWebhook?.(body);
    if (!parsed) {
      console.warn("[webhook/momo] unparseable payload:", body);
      return ok({ ignored: true });
    }

    console.info("[webhook/momo] received:", {
      referenceId: parsed.providerReference,
      status: parsed.status,
    });

    await applyProviderStatus(
      parsed.providerReference,
      parsed.status,
      parsed.failureReason,
      parsed.rawPayload
    );

    return ok({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhook/momo] error:", err);
    return ok({ received: true, error: message });
  }
});

export const GET = withApiHandler(async () => ok({ status: "ok" }));
