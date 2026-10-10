/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Liveness + shallow dependency probe for uptime monitors.
 * Does not require auth. Does not expose secrets.
 */

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET() {
  const started = Date.now();
  const checks: Record<
    string,
    { ok: boolean; ms?: number; detail?: string }
  > = {};

  // App process is alive if we respond
  checks.app = { ok: true, ms: 0 };

  // Postgres via Supabase admin (service role)
  try {
    const t0 = Date.now();
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("staff").select("id").limit(1);
    checks.database = {
      ok: !error,
      ms: Date.now() - t0,
      detail: error ? error.message.slice(0, 120) : undefined,
    };
  } catch (err) {
    checks.database = {
      ok: false,
      detail: err instanceof Error ? err.message.slice(0, 120) : "db probe failed",
    };
  }

  // Rate-limit backend presence (not a hard dependency)
  const upstashConfigured = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
  checks.rateLimit = {
    ok: true,
    detail: process.env.RATE_LIMIT_ENABLED
      ? upstashConfigured
        ? "enabled+upstash"
        : "enabled+memory"
      : "disabled",
  };

  const healthy = checks.app.ok && checks.database.ok;
  const body = {
    ok: healthy,
    status: healthy ? "healthy" : "degraded",
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    region: process.env.VERCEL_REGION ?? null,
    elapsedMs: Date.now() - started,
    checks,
    at: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: healthy ? 200 : 503,
    headers: NO_STORE,
  });
}
