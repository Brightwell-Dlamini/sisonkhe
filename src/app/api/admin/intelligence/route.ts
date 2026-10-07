/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/admin/intelligence — live decision snapshot for Command Centre.
 * Rank admin: region-scoped. Super-admin: national.
 */

import { requireAdminScope } from "@/lib/auth/session";
import { buildIntelligenceSnapshot } from "@/lib/intelligence/snapshot";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  const { user } = await requireAdminScope();
  const snapshot = await buildIntelligenceSnapshot(user);
  return ok(snapshot);
});
