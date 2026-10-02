/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getOperatorMasterCard } from "@/lib/operator/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "operator" || !session.operatorId) {
      return NextResponse.json({ error: "Operator only" }, { status: 403 });
    }

    const card = await getOperatorMasterCard(session.operatorId);
    if (!card) {
      return NextResponse.json({ error: "No master card" }, { status: 404 });
    }

    return NextResponse.json({ card });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
