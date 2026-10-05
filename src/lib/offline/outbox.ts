/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Offline outbox operations.
 * Compatible with SyncWorker + src/lib/offline/sync.ts
 */

"use client";

import { offlineDB, type OutboxEntry } from "./db";

const CLIENT_ID_KEY = "sisonkhe:clientId";

export function getClientId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export async function enqueue(
  entry: Omit<OutboxEntry, "id" | "status" | "attempts" | "createdAt" | "clientId"> & {
    id?: string;
    clientId?: string;
  }
): Promise<string> {
  const id =
    entry.id ??
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `out-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  const full: OutboxEntry = {
    id,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    payload: entry.payload,
    idempotencyKey: entry.idempotencyKey,
    clientId: entry.clientId ?? getClientId(),
    createdAt: new Date().toISOString(),
    status: "pending",
    attempts: 0,
    baseVersion: entry.baseVersion,
  };

  await offlineDB.outbox.put(full);
  return id;
}

export async function listPending(): Promise<OutboxEntry[]> {
  return offlineDB.outbox
    .where("status")
    .anyOf(["pending", "in_flight"])
    .sortBy("createdAt");
}

export async function markInFlight(id: string): Promise<void> {
  await offlineDB.outbox.update(id, {
    status: "in_flight",
    attempts: (await offlineDB.outbox.get(id))?.attempts ?? 0 + 1,
  });
}

export async function markSuccess(id: string): Promise<void> {
  await offlineDB.outbox.delete(id);
}

export async function markFailure(id: string, reason: string): Promise<void> {
  await offlineDB.outbox.update(id, {
    status: "failed",
    lastError: reason,
  });
}

export async function pendingCount(): Promise<number> {
  return offlineDB.outbox.where("status").equals("pending").count();
}
