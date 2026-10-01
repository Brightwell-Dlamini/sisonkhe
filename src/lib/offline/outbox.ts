/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Outbox queue for offline mutations.
 */

"use client";

import { offlineDB, getClientId, type OutboxEntry } from "./db";

// ---------------------------------------------------------------------------
// Enqueue
// ---------------------------------------------------------------------------

export interface EnqueueInput {
  action: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
}

export async function enqueue(input: EnqueueInput): Promise<OutboxEntry> {
  const clientId = await getClientId();
  const id =
    "ob-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  const idempotencyKey =
    "idem-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);

  const entry: OutboxEntry = {
    id,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    payload: input.payload,
    idempotencyKey,
    clientId,
    createdAt: Date.now(),
    attempts: 0,
    lastError: null,
    status: "pending",
  };

  await offlineDB.outbox.put(entry);
  notifyOutboxChange();
  return entry;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export async function listPending(): Promise<OutboxEntry[]> {
  const entries = await offlineDB.outbox
    .where("status")
    .anyOf("pending")
    .toArray();
  return entries.sort((a, b) => a.createdAt - b.createdAt);
}

export async function countPending(): Promise<number> {
  return offlineDB.outbox.where("status").equals("pending").count();
}

export async function countFailed(): Promise<number> {
  return offlineDB.outbox.where("status").equals("failed_permanent").count();
}

// ---------------------------------------------------------------------------
// State changes
// ---------------------------------------------------------------------------

export async function markInFlight(id: string): Promise<void> {
  await offlineDB.outbox.update(id, { status: "in_flight" });
  notifyOutboxChange();
}

export async function markSuccess(id: string): Promise<void> {
  await offlineDB.outbox.delete(id);
  notifyOutboxChange();
}

export async function markFailure(id: string, error: string): Promise<void> {
  const entry = await offlineDB.outbox.get(id);
  if (!entry) return;

  const attempts = entry.attempts + 1;
  const isPermanent = attempts >= 5; // after 5 failures, stop retrying

  await offlineDB.outbox.update(id, {
    status: isPermanent ? "failed_permanent" : "pending",
    attempts,
    lastError: error,
  });
  notifyOutboxChange();
}

export async function clearPermanentlyFailed(): Promise<void> {
  const failed = await offlineDB.outbox
    .where("status")
    .equals("failed_permanent")
    .toArray();
  for (const entry of failed) {
    await offlineDB.outbox.delete(entry.id);
  }
  notifyOutboxChange();
}

// ---------------------------------------------------------------------------
// Change notification (for UI hooks)
// ---------------------------------------------------------------------------

const outboxListeners = new Set<() => void>();

function notifyOutboxChange() {
  for (const l of outboxListeners) {
    try {
      l();
    } catch (err) {
      console.error("[outbox] listener error:", err);
    }
  }
}

export function subscribeOutbox(listener: () => void): () => void {
  outboxListeners.add(listener);
  return () => outboxListeners.delete(listener);
}
