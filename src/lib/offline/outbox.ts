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

/** Maximum delivery attempts before an entry is considered permanently failed. */
export const MAX_OUTBOX_ATTEMPTS = 8;

/**
 * Entries left in_flight longer than this (ms) are treated as stuck
 * (e.g. tab crash mid-batch) and reset to pending for retry.
 */
export const STUCK_IN_FLIGHT_MS = 2 * 60 * 1000; // 2 minutes

/** Listeners notified when outbox rows change (best-effort, same-tab). */
type OutboxListener = () => void;
const listeners = new Set<OutboxListener>();

function notifyOutbox(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* ignore listener errors */
    }
  }
}

/**
 * Subscribe to outbox mutations in this tab.
 * Returns an unsubscribe function.
 */
export function subscribeOutbox(listener: OutboxListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

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
  entry: Omit<
    OutboxEntry,
    "id" | "status" | "attempts" | "createdAt" | "clientId"
  > & {
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
  notifyOutbox();
  return id;
}

export async function listPending(): Promise<OutboxEntry[]> {
  return offlineDB.outbox
    .where("status")
    .anyOf(["pending", "in_flight"])
    .sortBy("createdAt");
}

/**
 * Reset entries stuck in_flight longer than STUCK_IN_FLIGHT_MS back to pending.
 * Protects against tab crashes mid-batch.
 */
export async function recoverStuckInFlight(): Promise<number> {
  const cutoff = Date.now() - STUCK_IN_FLIGHT_MS;
  const inFlight = await offlineDB.outbox
    .where("status")
    .equals("in_flight")
    .toArray();

  let recovered = 0;
  for (const row of inFlight) {
    const created = new Date(row.createdAt).getTime();
    // Prefer last touch; fall back to createdAt
    const touched = Number.isFinite(created) ? created : 0;
    if (touched > 0 && touched < cutoff) {
      await offlineDB.outbox.update(row.id, {
        status: "pending",
        lastError: "Recovered from stuck in_flight",
      });
      recovered++;
    }
  }
  if (recovered > 0) notifyOutbox();
  return recovered;
}

export async function markInFlight(id: string): Promise<void> {
  const row = await offlineDB.outbox.get(id);
  const nextAttempts = (row?.attempts ?? 0) + 1;

  if (nextAttempts > MAX_OUTBOX_ATTEMPTS) {
    await offlineDB.outbox.update(id, {
      status: "failed",
      attempts: nextAttempts,
      lastError: `Exceeded max attempts (${MAX_OUTBOX_ATTEMPTS})`,
    });
  } else {
    await offlineDB.outbox.update(id, {
      status: "in_flight",
      attempts: nextAttempts,
    });
  }
  notifyOutbox();
}

export async function markSuccess(id: string): Promise<void> {
  await offlineDB.outbox.delete(id);
  notifyOutbox();
}

export async function markFailure(id: string, reason: string): Promise<void> {
  const row = await offlineDB.outbox.get(id);
  const attempts = row?.attempts ?? 0;

  if (attempts >= MAX_OUTBOX_ATTEMPTS) {
    await offlineDB.outbox.update(id, {
      status: "failed",
      lastError: reason,
    });
  } else {
    // Leave as failed for permanent errors; caller decides permanent vs retriable
    await offlineDB.outbox.update(id, {
      status: "failed",
      lastError: reason,
    });
  }
  notifyOutbox();
}

/** Requeue a failed or rejected entry for another attempt (if under cap). */
export async function requeueForRetry(
  id: string,
  reason?: string
): Promise<boolean> {
  const row = await offlineDB.outbox.get(id);
  if (!row) return false;
  if ((row.attempts ?? 0) >= MAX_OUTBOX_ATTEMPTS) {
    await offlineDB.outbox.update(id, {
      status: "failed",
      lastError: reason ?? row.lastError ?? "Max attempts reached",
    });
    notifyOutbox();
    return false;
  }
  await offlineDB.outbox.update(id, {
    status: "pending",
    lastError: reason ?? row.lastError,
  });
  notifyOutbox();
  return true;
}

/** Pending + in-flight count (waiting to sync). */
export async function countPending(): Promise<number> {
  return offlineDB.outbox
    .where("status")
    .anyOf(["pending", "in_flight"])
    .count();
}

/** Failed outbox entries. */
export async function countFailed(): Promise<number> {
  return offlineDB.outbox.where("status").equals("failed").count();
}

/** @deprecated Prefer countPending */
export async function pendingCount(): Promise<number> {
  return countPending();
}
