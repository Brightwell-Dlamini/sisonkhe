/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aggregates audit events from multiple sources:
 *   - permit_audit_logs (permit approvals/rejections)
 *   - sync_events (all mutations)
 *
 * Supports offset/limit pagination via shared helpers.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import { buildPageMeta, type PageMeta } from "@/lib/pagination";

export interface AuditEntry {
  id: string;
  timestamp: string;
  source: "permit" | "sync" | "system";
  user: string;
  userRole: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string;
  ipAddress: string | null;
}

export interface AuditPage {
  entries: AuditEntry[];
  meta: PageMeta;
}

/**
 * Fetch a merged, time-sorted audit page.
 * Fetches a window from each source then merges — acceptable until a
 * unified audit_events table exists.
 */
export async function listAuditEntries(
  limit: number = 50,
  offset: number = 0
): Promise<AuditPage> {
  const admin = createSupabaseAdminClient();
  // Over-fetch so merge+slice remains accurate for modest pages
  const fetchLimit = Math.min(limit + offset + 50, 500);

  const [{ data: permitLogs }, { data: syncLogs }] = await Promise.all([
    admin
      .from("permit_audit_logs")
      .select(
        "id, user_role, date, time, action, approval_decision, previous_values, new_values, ip_address, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(fetchLimit),
    admin
      .from("sync_events")
      .select(
        "id, entity_type, entity_id, operation, client_id, occurred_at, applied_at, payload, idempotency_key"
      )
      .order("applied_at", { ascending: false })
      .limit(fetchLimit),
  ]);

  const entries: AuditEntry[] = [];

  for (const log of permitLogs ?? []) {
    const details = log.approval_decision
      ? `Decision: ${log.approval_decision}`
      : `Previous: ${JSON.stringify(log.previous_values).slice(0, 80)} → New: ${JSON.stringify(log.new_values).slice(0, 80)}`;
    entries.push({
      id: `permit-${log.id}`,
      timestamp: (log.created_at as string) ?? `${log.date}T${log.time}`,
      source: "permit",
      user: "Staff",
      userRole: (log.user_role as string) ?? "Unknown",
      action: log.action as string,
      entityType: "permit",
      entityId: null,
      details,
      ipAddress: (log.ip_address as string | null) ?? null,
    });
  }

  for (const log of syncLogs ?? []) {
    const payload = (log.payload as Record<string, unknown>) ?? {};
    entries.push({
      id: `sync-${log.id}`,
      timestamp: (log.applied_at as string) ?? (log.occurred_at as string),
      source: "sync",
      user: "Client device",
      userRole: "Field",
      action: `${log.operation} ${log.entity_type}`,
      entityType: log.entity_type as string,
      entityId: log.entity_id as string,
      details: `Payload: ${JSON.stringify(payload).slice(0, 120)}`,
      ipAddress: null,
    });
  }

  entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const total = entries.length;
  const page = Math.floor(offset / limit) + 1;
  const slice = entries.slice(offset, offset + limit);

  return {
    entries: slice,
    meta: buildPageMeta(total, page, limit),
  };
}
