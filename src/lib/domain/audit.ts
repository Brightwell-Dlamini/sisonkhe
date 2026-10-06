/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Append-only operational audit (best-effort if table missing).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction =
  | "assignment.link"
  | "assignment.unlink"
  | "driver.suspend"
  | "driver.update"
  | "vehicle.create"
  | "vehicle.update"
  | "vehicle.deactivate"
  | "permit.approve"
  | "permit.reject"
  | "permit.print"
  | "dispatch.load"
  | "dispatch.depart"
  | "dispatch.delay"
  | "dispatch.breakdown"
  | "dispatch.reset"
  | "ticket.issue"
  | "transfer.vehicle"
  | "marshal.create"
  | "marshal.update";

export type AuditEntry = {
  action: AuditAction;
  actorId?: string | null;
  actorRole?: string | null;
  actorName?: string | null;
  entityType: string;
  entityId: string;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
};

export async function writeAudit(
  admin: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  try {
    await admin.from("operational_audit").insert({
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      action: entry.action,
      actor_id: entry.actorId ?? null,
      actor_role: entry.actorRole ?? null,
      actor_name: entry.actorName ?? null,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      summary: entry.summary,
      before_json: entry.before ?? null,
      after_json: entry.after ?? null,
      meta_json: entry.meta ?? null,
    });
  } catch (err) {
    console.warn("[audit] write failed (non-fatal):", err);
  }
}
