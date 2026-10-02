/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/driver/card/topup
 * Body: { amount: number, providerId: "manual" | "momo" | "emlangeni", payerPhone?: string }
 *
 * Creates a payment intent for a vehicle card top-up.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getDriverContext } from "@/lib/driver/queries";
import { createIntent } from "@/lib/payments/intent";
import type { ProviderId } from "@/lib/payments/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "driver") {
      return NextResponse.json({ error: "Driver only" }, { status: 403 });
    }
    const ctx = await getDriverContext(session.authUserId);
    if (!ctx || !ctx.vehicle) {
      return NextResponse.json({ error: "No vehicle" }, { status: 404 });
    }

    const body = await request.json();
    const amount = Number(body.amount ?? 0);
    const providerId = String(body.providerId ?? "manual") as ProviderId;
    const payerPhone = body.payerPhone ? String(body.payerPhone) : undefined;

    if (amount <= 0) {
      return NextResponse.json({ error: "amount must be positive" }, { status: 400 });
    }

    const result = await createIntent({
      providerId,
      amountSzl: amount,
      purpose: "vehicle_card_topup",
      targetEntityId: ctx.vehicle.registrationNumber,
      initiatedBy: session.authUserId,
      payerPhone,
      payerName: ctx.fullName,
      description: `Driver top-up for ${ctx.vehicle.registrationNumber}`,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error, intent: result.intent },
        { status: 400 }
      );
    }

    return NextResponse.json({ intent: result.intent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/driver/card/topup] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
