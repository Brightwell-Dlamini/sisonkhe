/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Liveness + shallow dependency check for production monitoring.
 */

import { NextResponse } from "next/server";
import { getStoreBackendName } from "@/lib/fleetStore";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const started = Date.now();
  let store = "unknown";
  try {
    store = getStoreBackendName();
  } catch {
    store = "error";
  }

  const checks: Record<string, "ok" | "fail" | "skip"> = {
    store: store === "error" ? "fail" : "ok",
    supabase: "skip",
  };

  // Shallow Supabase connectivity (service role). Does not write data.
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("staff").select("id").limit(1);
    checks.supabase = error ? "fail" : "ok";
  } catch {
    checks.supabase = "fail";
  }

  const healthy =
    checks.store !== "fail" && checks.supabase !== "fail";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "Sisonkhe In Transit",
      version: "1.0.2",
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - started,
      environment:
        process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
      store,
      checks,
    },
    { status: healthy ? 200 : 503 }
  );
}
