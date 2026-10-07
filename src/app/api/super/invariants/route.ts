/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  → latest report (does not run checks)
 * POST → run checks now, then return the fresh report
 */

import { requireServerRole } from "@/lib/auth/session";
import { loadLatestReport, runInvariantChecks } from "@/lib/invariants/runner";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  await requireServerRole(["super-admin"]);
  const report = await loadLatestReport();
  return ok(report);
});

export const POST = withApiHandler(async () => {
  await requireServerRole(["super-admin"]);
  const summary = await runInvariantChecks();
  const report = await loadLatestReport();
  return ok({ summary, ...report });
});
