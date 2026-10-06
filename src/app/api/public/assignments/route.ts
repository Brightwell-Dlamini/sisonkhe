/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public self-service link: national ID + plate only. Never force.
 * Rate limited. Used by /register if needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { assignDriverVehicle } from "@/lib/assignments/service";
import { rateLimit } from "@/lib/domain/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  nationalId: z.string().trim().min(5).max(40),
  vehicleReg: z.string().trim().min(3).max(20),
});

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rl = rateLimit(`public-assign:${ip}`, 10, 15 * 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "National ID and vehicle registration required." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const result = await assignDriverVehicle(admin, {
      nationalId: parsed.data.nationalId,
      vehicleReg: parsed.data.vehicleReg,
      force: false,
    });

    return NextResponse.json({ success: true, assignment: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      typeof err === "object" && err && "status" in err
        ? Number((err as { status: number }).status)
        : 500;
    return NextResponse.json({ error: message }, { status: status || 500 });
  }
}
