/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/sync/status — heartbeat + latest seq.
 */

import { requireServerSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  await requireServerSession();

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("sync_events")
    .select("seq")
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  return ok({
    serverSeq: data?.seq ?? 0,
    serverTime: new Date().toISOString(),
  });
});
