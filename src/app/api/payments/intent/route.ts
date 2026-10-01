/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/payments/intent   — create a payment intent
 * GET  /api/payments/intent   — list caller's intents
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { createIntent, listIntentsForUser } from "@/lib/payments/intent";
import { listEnabledProviders, isLive } from "@/lib/payments/providers";
import type { PaymentPurpose, ProviderId } from "@/lib/payments/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["operator", "super-admin", "fleet-manager", "admin"];

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const intents = await listIntentsForUser(session.authUserId, 50);
    const providers = listEnabledProviders().map((p) => ({
      id: p.id,
      displayName: p.displayName,
      requiresPayerPhone: p.requiresPayerPhone,
    }));

    return NextResponse.json({
      intents,
      providers,
      live: isLive(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/payments/intent] GET error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const providerId = String(body.providerId ?? "") as ProviderId;
    const amountSzl = Number(body.amountSzl ?? 0);
    const purpose = String(body.purpose ?? "") as PaymentPurpose;
    const targetEntityId = String(body.targetEntityId ?? "").trim();
    const payerPhone = body.payerPhone ? String(body.payerPhone) : undefined;
    const payerName = body.payerName ? String(body.payerName) : undefined;
    const description = body.description ? String(body.description) : undefined;

    if (!providerId || !purpose || !targetEntityId) {
      return NextResponse.json(
        { error: "providerId, purpose, and targetEntityId are required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amountSzl) || amountSzl <= 0) {
      return NextResponse.json(
        { error: "amountSzl must be a positive number" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { intent: result.intent, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ intent: result.intent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/payments/intent] POST error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
