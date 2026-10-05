/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Offline outbox: queue SyncEvents locally and flush when online.
 */

"use client";

import { getOfflineDb } from "./db";
import type { SyncEvent } from "@/lib/sync/protocol";
import { pushEvents } from "@/lib/sync/client";

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

/** Enqueue an event for later delivery */
export async function enqueueEvent(event: SyncEvent): Promise<void> {
  const db = getOfflineDb();
  await db.outbox.put(event);
}

/** Flush the outbox to the server. Returns number of events accepted. */
export async function flushOutbox(): Promise<{ accepted: number; rejected: number }> {
  const db = getOfflineDb();
  const pending = await db.outbox.orderBy("occurredAt").toArray();

  if (pending.length === 0) {
    return { accepted: 0, rejected: 0 };
  }

  const clientId = getClientId();
  let totalAccepted = 0;
  let totalRejected = 0;

  // Send in batches of 50
  for (let i = 0; i < pending.length; i += 50) {
    const batch = pending.slice(i, i + 50);
    try {
      const result = await pushEvents(batch, clientId);
      totalAccepted += result.accepted.length;
      totalRejected += result.rejected.length;

      // Remove accepted events from outbox
      await db.outbox.bulkDelete(result.accepted);

      // Leave rejected ones for inspection / retry with different baseVersion
      if (result.rejected.length > 0) {
        console.warn("[outbox] rejected events", result.rejected);
      }
    } catch (err) {
      console.error("[outbox] flush failed", err);
      break; // stop on network error; will retry later
    }
  }

  return { accepted: totalAccepted, rejected: totalRejected };
}

/** Wire up automatic flush on online + interval */
export function startOutboxWorker(intervalMs = 15_000): () => void {
  if (typeof window === "undefined") return () => {};

  const onOnline = () => {
    void flushOutbox();
  };

  window.addEventListener("online", onOnline);
  const timer = setInterval(() => {
    if (navigator.onLine) void flushOutbox();
  }, intervalMs);

  // Immediate attempt
  if (navigator.onLine) void flushOutbox();

  return () => {
    window.removeEventListener("online", onOnline);
    clearInterval(timer);
  };
}
