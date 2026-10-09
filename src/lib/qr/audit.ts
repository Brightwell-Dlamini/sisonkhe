/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Best-effort QR scan audit. Never throws into the verify path.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface QrScanAuditInput {
  valid: boolean;
  reason?: string | null;
  entityType?: string | null;
  entityKey?: string | null;
  source?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  userAgent?: string | null;
  ipHint?: string | null;
}

export async function logQrScan(input: QrScanAuditInput): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `qrscan_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    await admin.from("qr_scan_events").insert({
      id,
      valid: input.valid,
      reason: input.reason ?? null,
      entity_type: input.entityType ?? null,
      entity_key: input.entityKey ?? null,
      source: input.source ?? "unknown",
      actor_user_id: input.actorUserId ?? null,
      actor_role: input.actorRole ?? null,
      user_agent: input.userAgent ?? null,
      ip_hint: input.ipHint ?? null,
      scanned_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[qr/audit] log failed (table may be missing):", err);
  }
}
