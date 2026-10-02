/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/operator/master-card/freeze
 * Toggles card status between Active and Frozen.
 */

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "operator" || !session.operatorId) {
      return NextResponse.json({ error: "Operator only" }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const { data: card } = await admin
      .from("operator_master_cards")
      .select("id, status")
      .eq("operator_id", session.operatorId)
      .maybeSingle();

    if (!card) {
      return NextResponse.json({ error: "No card" }, { status: 404 });
    }

    const nextStatus = card.status === "Active" ? "Frozen" : "Active";
    const { error } = await admin
      .from("operator_master_cards")
      .update({ status: nextStatus })
      .eq("id", card.id as string);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
