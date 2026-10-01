/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * e-Mlangeni webhook receiver.
 */

import { NextRequest, NextResponse } from "next/server";
import { applyProviderStatus } from "@/lib/payments/intent";
import { emlangeniProvider } from "@/lib/payments/providers/emlangeni";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = emlangeniProvider.parseWebhook?.(body);
    if (!parsed) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    await applyProviderStatus(
      parsed.providerReference,
      parsed.status,
      parsed.failureReason,
      parsed.rawPayload
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/emlangeni] error:", err);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
