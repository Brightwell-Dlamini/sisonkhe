/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MTN MoMo webhook receiver.
 *
 * Configure in your MoMo merchant dashboard:
 *   MOMO_CALLBACK_URL = https://your-domain/api/payments/webhooks/momo
 *
 * Security: In production, MoMo signs webhooks. We recommend verifying the
 * signature using MOMO_SUBSCRIPTION_KEY. For the sandbox phase, we accept
 * any webhook and rely on the fact that the providerReference must match a
 * real intent.
 */

import { NextRequest, NextResponse } from "next/server";
import { applyProviderStatus } from "@/lib/payments/intent";
import { momoProvider } from "@/lib/payments/providers/momo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = momoProvider.parseWebhook?.(body);
    if (!parsed) {
      console.warn("[webhook/momo] unparseable payload:", body);
      return NextResponse.json({ ok: true, ignored: true });
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhook/momo] error:", err);
    // Always 200 to prevent provider retries on our bugs
    return NextResponse.json({ ok: true, error: message });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
