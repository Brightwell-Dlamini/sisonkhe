/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET    /api/payments/intent/[id]  — fetch one
 * POST   /api/payments/intent/[id]  — poll provider for status
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getIntent, applyProviderStatus } from "@/lib/payments/intent";
import { getProvider } from "@/lib/payments/providers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const intent = await getIntent(id);
    if (!intent) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Owners can see their own intents; staff can see all
    const isOwner = intent.initiatedBy === session.authUserId;
    const isStaff = ["super-admin", "admin", "fleet-manager"].includes(
      session.role
    );
    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ intent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/payments/intent/[id]] GET error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(_: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const intent = await getIntent(id);
    if (!intent) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (intent.initiatedBy !== session.authUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Already terminal — nothing to do
    if (["completed", "failed", "cancelled", "expired"].includes(intent.status)) {
      return NextResponse.json({ intent });
    }

    // Ask provider
    const provider = getProvider(intent.providerId);
    if (!provider || !intent.providerReference) {
      return NextResponse.json(
        { error: "Provider unavailable" },
        { status: 500 }
      );
    }

    const result = await provider.checkStatus(intent.providerReference);

    // Apply if terminal
    if (["completed", "failed", "cancelled", "expired"].includes(result.status)) {
      const applied = await applyProviderStatus(
        intent.providerReference,
        result.status,
        result.failureReason,
        result.rawResponse
      );
      return NextResponse.json({
        intent: applied.intent ?? intent,
      });
    }

    // Still pending — return the intent as-is
    return NextResponse.json({ intent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/payments/intent/[id]] POST error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
