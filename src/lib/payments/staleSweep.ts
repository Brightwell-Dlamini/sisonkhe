/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Expire payment intents stuck in pending/processing past a threshold.
 * Does not reverse money — only closes the lifecycle so ops can see truth.
 */

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/domain/audit";

export interface StaleSweepResult {
  scanned: number;
  expired: number;
  ids: string[];
  thresholdHours: number;
}

export async function sweepStalePaymentIntents(opts?: {
  thresholdHours?: number;
  limit?: number;
}): Promise<StaleSweepResult> {
  const thresholdHours = opts?.thresholdHours ?? 24;
  const limit = opts?.limit ?? 200;
  const admin = createSupabaseAdminClient();
  const cutoff = new Date(
    Date.now() - thresholdHours * 3600_000
  ).toISOString();

  const { data: rows, error } = await admin
    .from("payment_intents")
    .select("id, status, updated_at, created_at, purpose, amount_szl")
    .in("status", ["pending", "processing"])
    .lt("updated_at", cutoff)
    .limit(limit);

  if (error) {
    throw new Error(`stale sweep query failed: ${error.message}`);
  }

  const scanned = rows?.length ?? 0;
  const ids: string[] = [];
  const now = new Date().toISOString();

  for (const row of rows ?? []) {
    const id = String(row.id);
    const { data: updated } = await admin
      .from("payment_intents")
      .update({
        status: "expired",
        failure_reason: `AUTO_EXPIRED: stuck ${row.status} beyond ${thresholdHours}h`,
        completed_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .in("status", ["pending", "processing"])
      .select("id")
      .maybeSingle();

    if (updated) {
      ids.push(id);
      await writeAudit(admin, {
        action: "payment.intent_expired",
        actorId: "system",
        actorRole: "system",
        entityType: "payment_intent",
        entityId: id,
        summary: `Auto-expired stale ${row.status} intent (${row.purpose}, E${row.amount_szl})`,
        meta: {
          previousStatus: row.status,
          thresholdHours,
        },
      });
    }
  }

  return {
    scanned,
    expired: ids.length,
    ids,
    thresholdHours,
  };
}
