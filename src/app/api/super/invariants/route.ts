/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 0 — Invariant observation endpoint.
 *
 *   GET  → latest report (does not run checks)
 *   POST → run checks now, then return the fresh report
 *
 * Access: super-admin only.
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadLatestReport, runInvariantChecks } from "@/lib/invariants/runner";

async function assertSuperAdmin(): Promise<
  { ok: true } | { ok: false; status: number; message: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, status: 401, message: "Not authenticated" };

  const { data, error } = await supabase
    .from("staff")
    .select("role, is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) return { ok: false, status: 500, message: error.message };
  if (!data) return { ok: false, status: 403, message: "Not staff" };
  if (data.role !== "super-admin")
    return { ok: false, status: 403, message: "Super-admin only" };
  if (data.is_active !== true)
    return { ok: false, status: 403, message: "Inactive" };

  return { ok: true };
}

export async function GET() {
  const gate = await assertSuperAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  try {
    const report = await loadLatestReport();
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  const gate = await assertSuperAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  try {
    const summary = await runInvariantChecks();
    const report = await loadLatestReport();
    return NextResponse.json({ summary, ...report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
