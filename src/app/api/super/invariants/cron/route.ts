/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 0 — Nightly invariant cron entry point.
 *
 * Called by Vercel Cron. Verifies the CRON_SECRET header, runs the
 * invariant checks, returns the summary.
 *
 * This route is the ONLY way to run checks outside of the super-admin
 * POST /api/super/invariants. It exists so the nightly job does not need
 * a user session.
 *
 * Security:
 *   - Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically
 *     when CRON_SECRET is set in the project env.
 *   - We compare in constant time.
 *   - We do not log the secret.
 */

import { NextResponse } from "next/server";
import { runInvariantChecks } from "@/lib/invariants/runner";

export const dynamic = "force-dynamic";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    // Fail loud — a cron without a secret is a security hole.
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!provided || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runInvariantChecks();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
