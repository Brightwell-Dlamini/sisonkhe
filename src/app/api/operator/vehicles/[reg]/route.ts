/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getOperatorVehicleCard } from "@/lib/operator/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Params {
  params: Promise<{ reg: string }>;
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "operator" || !session.operatorId) {
      return NextResponse.json({ error: "Operator only" }, { status: 403 });
    }

    const { reg } = await params;
    const decoded = decodeURIComponent(reg).toUpperCase();

    const card = await getOperatorVehicleCard(session.operatorId, decoded);
    if (!card) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ card });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
