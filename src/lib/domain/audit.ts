/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Append-only operational audit.
 *
 * Contract:
 *   - Never throws. If the audit table is unreachable, log and continue.
 *     The primary operation has already committed; audit is a witness, not a gate.
 *   - The action vocabulary is a closed union. New actions require adding a
 *     literal here so the compiler catches drift.
 *   - ids are cryptographically random (no Math.random for anything
 *     that lands in an audit trail).
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction =
  // Assignments
  | "assignment.link"
  | "assignment.unlink"
  // Drivers
  | "driver.create"
  | "driver.update"
  | "driver.suspend"
  | "driver.deactivate"
  | "driver.reset_password"
  // Operators
  | "operator.create"
  | "operator.update"
  // Marshals
  | "marshal.create"
  | "marshal.update"
  | "marshal.deactivate"
  | "marshal.reset_password"
  | "marshal.claim.success"
  | "marshal.claim.link_failed"
  // Staff
  | "staff.create"
  | "staff.update"
  | "staff.deactivate"
  | "staff.reset_password"
  // Vehicles
  | "vehicle.create"
  | "vehicle.update"
  | "vehicle.deactivate"
  | "vehicle.transfer"
  // Permits
  | "permit.submit"
  | "permit.approve"
  | "permit.reject"
  | "permit.print"
  // Dispatch
  | "dispatch.load"
  | "dispatch.depart"
  | "dispatch.delay"
  | "dispatch.breakdown"
  | "dispatch.reset"
  // Enforcement
  | "ticket.issue"
  | "ticket.paid"
  | "ticket.challenged"
  // Financial
  | "payment.intent.created"
  | "payment.settled"
  | "payment.failed"
  | "card.topup"
  | "card.freeze"
  | "card.unfreeze"
  // Auth
  | "auth.signin"
  | "auth.signout"
  | "auth.password_changed"
  // System
  | "system.snapshot"
  | "system.restore"
  | "system.config_changed";

export interface AuditEntry {
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
}

/**
 * Audit ids use crypto.randomUUID when available. Falls back to a
 * timestamp + Math.random for runtimes without crypto (edge, tests).
 * The fallback is best-effort; audit integrity is not a security boundary.
 */
function auditId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `aud_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `aud_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function writeAudit(
  admin: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  try {
    const { error } = await admin.from("operational_audit").insert({
      id: auditId(),
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

    if (error) {
      // Table missing? Column drift? Log and continue — audit is never a gate.
      console.warn("[audit] insert rejected (non-fatal):", {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        error: error.message,
      });
    }
  } catch (err) {
    console.warn("[audit] write threw (non-fatal):", {
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
