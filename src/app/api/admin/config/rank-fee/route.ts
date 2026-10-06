import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import {
  getRankFeeConfig,
  setRankFeeConfig,
} from "@/lib/domain/rankFee";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireServerRole(["super-admin", "admin", "fleet-manager"]);
    const admin = createSupabaseAdminClient();
    const config = await getRankFeeConfig(admin);
    return NextResponse.json(config);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireServerRole(["super-admin"]);
    const body = await request.json();
    const config = {
      rankFee: Number(body.rankFee ?? 25),
      splitOperational: Number(body.splitOperational ?? 20),
      splitNRTC: Number(body.splitNRTC ?? 3.5),
      splitMaintenance: Number(body.splitMaintenance ?? 1.5),
    };
    const sum =
      config.splitOperational + config.splitNRTC + config.splitMaintenance;
    if (Math.abs(sum - config.rankFee) > 0.01) {
      return NextResponse.json(
        {
          error: `Splits must sum to rank fee (got ${sum}, fee ${config.rankFee}).`,
        },
        { status: 400 }
      );
    }
    const admin = createSupabaseAdminClient();
    await setRankFeeConfig(admin, config);
    return NextResponse.json({ success: true, config });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
