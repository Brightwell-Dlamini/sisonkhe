/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side event application.
 * Applies SyncEvents to the relational store with idempotency and version checks.
 */

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { SyncEvent, SyncPushResult } from "./protocol";

const ENTITY_TABLE: Record<string, string> = {
  vehicle: "vehicles",
  driver: "drivers",
  marshal: "marshals",
  route: "routes",
  trip: "trips",
  incident: "incidents",
  notification: "notifications",
  advert: "adverts",
  staff: "staff",
  operator: "fleet_operators",
};

export async function applyEvents(
  events: SyncEvent[],
  clientId: string
): Promise<SyncPushResult> {
  const admin = createSupabaseAdminClient();
  const accepted: string[] = [];
  const rejected: Array<{ id: string; reason: string }> = [];

  for (const event of events) {
    try {
      // Idempotency: skip if already applied
      const { data: existing } = await admin
        .from("sync_events")
        .select("id")
        .eq("idempotency_key", event.idempotencyKey)
        .maybeSingle();

      if (existing) {
        accepted.push(event.id);
        continue;
      }

      const table = ENTITY_TABLE[event.entityType];
      if (!table) {
        rejected.push({ id: event.id, reason: `Unknown entityType: ${event.entityType}` });
        continue;
      }

      if (event.operation === "UPDATE" && event.baseVersion != null) {
        // Optimistic concurrency check
        const { data: row } = await admin
          .from(table)
          .select("version")
          .eq(primaryKeyColumn(event.entityType), event.entityId)
          .maybeSingle();

        if (row && row.version !== event.baseVersion) {
          rejected.push({
            id: event.id,
            reason: `Version conflict: expected ${event.baseVersion}, found ${row.version}`,
          });
          continue;
        }
      }

      // Apply mutation
      if (event.operation === "INSERT") {
        const { error } = await admin.from(table).insert({
          ...event.payload,
          version: 1,
        });
        if (error) {
          rejected.push({ id: event.id, reason: error.message });
          continue;
        }
      } else if (event.operation === "UPDATE") {
        const { error } = await admin
          .from(table)
          .update({
            ...event.payload,
            version: (event.baseVersion ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq(primaryKeyColumn(event.entityType), event.entityId);

        if (error) {
          rejected.push({ id: event.id, reason: error.message });
          continue;
        }
      } else if (event.operation === "DELETE") {
        const { error } = await admin
          .from(table)
          .delete()
          .eq(primaryKeyColumn(event.entityType), event.entityId);

        if (error) {
          rejected.push({ id: event.id, reason: error.message });
          continue;
        }
      }

      // Record the event
      const { error: logError } = await admin.from("sync_events").insert({
        id: event.id,
        entity_type: event.entityType,
        entity_id: event.entityId,
        operation: event.operation,
        payload: event.payload,
        idempotency_key: event.idempotencyKey,
        client_id: clientId,
        occurred_at: event.occurredAt,
        base_version: event.baseVersion ?? null,
      });

      if (logError) {
        // Mutation succeeded but log failed — still accept to avoid double-apply on retry
        console.error("[sync] failed to log event", event.id, logError.message);
      }

      accepted.push(event.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      rejected.push({ id: event.id, reason: message });
    }
  }

  const latestSeq = await getLatestSeq();
  return { accepted, rejected, latestSeq };
}

function primaryKeyColumn(entityType: string): string {
  if (entityType === "vehicle") return "registration_number";
  return "id";
}

export async function getLatestSeq(): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("sync_events")
    .select("seq")
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.seq ?? 0;
}

export async function pullEvents(sinceSeq: number, limit = 100) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("sync_events")
    .select("*")
    .gt("seq", sinceSeq)
    .order("seq", { ascending: true })
    .limit(limit + 1);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;

  return {
    events: slice.map((r) => ({
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      operation: r.operation,
      payload: r.payload ?? {},
      idempotencyKey: r.idempotency_key,
      clientId: r.client_id,
      occurredAt: r.occurred_at,
      baseVersion: r.base_version ?? undefined,
      seq: r.seq,
      appliedAt: r.applied_at,
    })),
    latestSeq: slice.length ? slice[slice.length - 1].seq : sinceSeq,
    hasMore,
  };
}
