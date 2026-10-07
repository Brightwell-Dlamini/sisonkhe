/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/domain/audit";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const RESTORE_ORDER = [
  "regions",
  "routes",
  "staff",
  "drivers",
  "fleet_operators",
  "vehicles",
  "marshals",
] as const;

export const POST = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  const session = await requireServerRole(["super-admin"]);
  const { id } = await ctx.params;
  const admin = createSupabaseAdminClient();

  const { data: snap } = await admin
    .from("system_snapshots")
    .select("snapshot_data")
    .eq("id", id)
    .maybeSingle();

  if (!snap) throw AppError.notFound("Snapshot");

  const data = snap.snapshot_data as Record<string, unknown[]>;

  for (const table of RESTORE_ORDER) {
    const rows = data[table];
    if (!rows || rows.length === 0) continue;
    for (const row of rows) {
      await admin.from(table).upsert(row as Record<string, unknown>);
    }
  }

  await writeAudit(admin, {
    action: "system.snapshot_restore",
    actorId: session.authUserId,
    actorRole: session.role,
    actorName: session.fullName,
    entityType: "snapshot",
    entityId: id,
    summary: `Restored snapshot ${id}`,
  });

  return ok({ success: true });
});
