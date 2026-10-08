/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side event application.
 *
 * Apply order (per event):
 *   0. Authorize caller against entityType / operation / ownership.
 *   1. Claim idempotency via insert into sync_events (unique key).
 *   2. Apply mutation to entity table.
 *   3. On mutation failure, delete the claimed event so the client can retry.
 *
 * This avoids “mutation applied, log missing” and “log present, mutation missing”
 * without requiring a multi-statement SQL transaction from the JS client.
 */

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { ResolvedUser } from "@/lib/auth/roles";
import type { SyncEvent, SyncPushResult } from "./protocol";
import { authorizeSyncEvent } from "./authorize";

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

function primaryKeyColumn(entityType: string): string {
  if (entityType === "vehicle") return "registration_number";
  return "id";
}

export async function applyEvents(
  events: SyncEvent[],
  clientId: string,
  actor: ResolvedUser
): Promise<SyncPushResult> {
  const admin = createSupabaseAdminClient();
  const accepted: string[] = [];
  const rejected: Array<{ id: string; reason: string }> = [];

  for (const event of events) {
    try {
      const authReason = authorizeSyncEvent(actor, event);
      if (authReason) {
        rejected.push({ id: event.id, reason: authReason });
        continue;
      }

      const table = ENTITY_TABLE[event.entityType];
      if (!table) {
        rejected.push({
          id: event.id,
          reason: `Unknown entityType: ${event.entityType}`,
        });
        continue;
      }

      // 1. Claim idempotency key first
      const { error: claimErr } = await admin.from("sync_events").insert({
        id: event.id,
        entity_type: event.entityType,
        entity_id: event.entityId,
        operation: event.operation,
        payload: event.payload,
        idempotency_key: event.idempotencyKey,
        client_id: clientId,
        occurred_at: event.occurredAt,
        base_version: event.baseVersion ?? null,
        actor_auth_user_id: actor.authUserId,
        actor_role: actor.role,
      });

      if (claimErr) {
        const code = (claimErr as { code?: string }).code;
        const msg = claimErr.message ?? "";
        if (code === "23505" || /duplicate|unique/i.test(msg)) {
          accepted.push(event.id);
          continue;
        }
        rejected.push({ id: event.id, reason: `Claim failed: ${msg}` });
        continue;
      }

      // 2. Optimistic concurrency for UPDATE (baseVersion required by authorize)
      if (event.operation === "UPDATE" && event.baseVersion != null) {
        const { data: row } = await admin
          .from(table)
          .select("version")
          .eq(primaryKeyColumn(event.entityType), event.entityId)
          .maybeSingle();

        if (row && row.version !== event.baseVersion) {
          await admin.from("sync_events").delete().eq("id", event.id);
          rejected.push({
            id: event.id,
            reason: `Version conflict: expected ${event.baseVersion}, found ${row.version}`,
          });
          continue;
        }
      }

      // 3. Apply mutation
      let mutationError: string | null = null;

      if (event.operation === "INSERT") {
        const { error } = await admin.from(table).insert({
          ...event.payload,
          version: 1,
        });
        if (error) mutationError = error.message;
      } else if (event.operation === "UPDATE") {
        const { error } = await admin
          .from(table)
          .update({
            ...event.payload,
            version: (event.baseVersion ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq(primaryKeyColumn(event.entityType), event.entityId);
        if (error) mutationError = error.message;
      } else if (event.operation === "DELETE") {
        const { error } = await admin
          .from(table)
          .delete()
          .eq(primaryKeyColumn(event.entityType), event.entityId);
        if (error) mutationError = error.message;
      } else {
        mutationError = `Unknown operation: ${event.operation}`;
      }

      if (mutationError) {
        await admin.from("sync_events").delete().eq("id", event.id);
        rejected.push({ id: event.id, reason: mutationError });
        continue;
      }

      accepted.push(event.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      try {
        await admin.from("sync_events").delete().eq("id", event.id);
      } catch {
        /* ignore */
      }
      rejected.push({ id: event.id, reason: message });
    }
  }

  const latestSeq = await getLatestSeq();
  return { accepted, rejected, latestSeq };
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
  const safeLimit = Math.min(Math.max(1, limit), 500);
  const { data, error } = await admin
    .from("sync_events")
    .select("*")
    .gt("seq", sinceSeq)
    .order("seq", { ascending: true })
    .limit(safeLimit + 1);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const hasMore = rows.length > safeLimit;
  const slice = hasMore ? rows.slice(0, safeLimit) : rows;

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
