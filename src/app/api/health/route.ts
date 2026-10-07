/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Liveness + expanded dependency / ops health for production monitoring.
 * Use ?deep=1 for full system metrics (slightly heavier).
 */

import { NextRequest, NextResponse } from "next/server";
import { buildSystemHealth } from "@/lib/system/health";
import { getStoreBackendName } from "@/lib/fleetStore";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const deep = req.nextUrl.searchParams.get("deep") === "1";

  if (deep) {
    try {
      const report = await buildSystemHealth();
      const http =
        report.status === "ok" ? 200 : report.status === "degraded" ? 200 : 503;
      return NextResponse.json(report, { status: http });
    } catch (err) {
      return NextResponse.json(
        {
          status: "down",
          error: err instanceof Error ? err.message : "health failed",
        },
        { status: 503 }
      );
    }
  }

  // Shallow path — cheap for load balancers
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

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("staff").select("id").limit(1);
    checks.supabase = error ? "fail" : "ok";
  } catch {
    checks.supabase = "fail";
  }

  const healthy = checks.store !== "fail" && checks.supabase !== "fail";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "Sisonkhe In Transit",
      version: "1.1.0",
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - started,
      environment:
        process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
      store,
      checks,
      hint: "Add ?deep=1 for sync lag, invariants, and payment metrics",
    },
    { status: healthy ? 200 : 503 }
  );
}
