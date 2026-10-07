/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Nightly invariant cron entry point.
 *
 * Called by Vercel Cron. Verifies the CRON_SECRET header, runs the
 * invariant checks, notifies super-admins when violations are found,
 * returns the summary.
 */

import { NextResponse } from "next/server";
import { runInvariantChecks } from "@/lib/invariants/runner";
import { notifyStaff } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    const total = Number(summary.total ?? 0);

    if (total > 0) {
      await notifyStaff(
        { roles: ["super-admin"] },
        {
          type: "system",
          title: `Invariant run — ${total} open issue(s)`,
          message: `Money: ${summary.money ?? 0} · Identity: ${summary.identity ?? 0} · Ops: ${summary.operational ?? 0}. Review /admin/super or invariants panel.`,
          href: "/super/invariants",
          entityType: "invariant_run",
          entityId: summary.run_id ?? summary.ran_at,
        }
      );
    }

    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
