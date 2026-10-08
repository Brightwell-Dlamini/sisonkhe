/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Nightly invariant cron. Authorization: Bearer $CRON_SECRET
 */

import { runInvariantChecks } from "@/lib/invariants/runner";
import { notifyStaff } from "@/lib/notifications/service";
import { requireCronSecret } from "@/lib/api/cronAuth";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = withApiHandler(async (request: Request) => {
  requireCronSecret(request);

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

  return ok({ summary });
});
