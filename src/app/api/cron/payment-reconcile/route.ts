/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Nightly payment reconciliation. Authorization: Bearer $CRON_SECRET
 */

import { runPaymentReconciliation } from "@/lib/payments/reconciliation";
import { notifyStaff } from "@/lib/notifications/service";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const GET = withApiHandler(async (request: Request) => {
  const expected = process.env.CRON_SECRET;
  if (!expected) throw AppError.internal("CRON_SECRET is not configured");

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided || !timingSafeEqual(provided, expected)) {
    throw AppError.unauthenticated();
  }

  const report = await runPaymentReconciliation();
  const high = report.issues.filter((i) => i.severity === "high");

  if (high.length > 0) {
    await notifyStaff(
      { roles: ["super-admin", "admin", "fleet-manager"] },
      {
        type: "system",
        title: `Payment reconciliation — ${high.length} high-priority issue(s)`,
        message: high
          .slice(0, 5)
          .map((i) => i.title)
          .join(" · "),
        href: "/admin/ledger",
        entityType: "reconciliation",
        entityId: report.generatedAt.slice(0, 10),
      }
    );
  }

  return ok({ report });
});
