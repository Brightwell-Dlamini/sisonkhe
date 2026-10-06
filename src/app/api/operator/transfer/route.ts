/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { transferToVehicle } from "@/lib/operator/transfers";
import { rateLimit } from "@/lib/domain/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "operator" || !session.operatorId) {
      return NextResponse.json({ error: "Operator only" }, { status: 403 });
    }

    const rl = rateLimit(`xfer:${session.operatorId}`, 20, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many transfers. Wait a moment." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const vehicleReg = String(body.vehicleReg ?? "").trim();
    const amountSzl = Number(body.amountSzl ?? 0);
    const category = String(body.category ?? "Fuel Allowance");
    const description = body.description ? String(body.description) : undefined;

    if (!vehicleReg || amountSzl <= 0) {
      return NextResponse.json(
        { error: "vehicleReg and positive amountSzl required" },
        { status: 400 }
      );
    }

    const result = await transferToVehicle({
      operatorId: session.operatorId,
      vehicleReg,
      amountSzl,
      category,
      description,
      actorUserId: session.authUserId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
