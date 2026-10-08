/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sync engine. Replays outbox entries against /api/sync/replay.
 * Runs in the background when online.
 */

"use client";

import { offlineDB } from "./db";
import {
  listPending,
  markInFlight,
  markSuccess,
  markFailure,
  requeueForRetry,
  recoverStuckInFlight,
  MAX_OUTBOX_ATTEMPTS,
} from "./outbox";
import { isOnline, subscribeNetwork } from "./network";

let syncInProgress = false;
let networkUnsub: (() => void) | null = null;

/**
 * Replay all pending outbox entries. Runs batches of 20.
 * Returns { processed, succeeded, failed }.
 */
export async function replayOutbox(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  if (syncInProgress) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }
  if (!isOnline()) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  syncInProgress = true;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    // Recover entries left in_flight by a previous crash
    await recoverStuckInFlight();

    // Loop until no more entries or we hit a hard stop
    while (true) {
      const pending = await listPending();
      // Skip entries that already exceeded the attempt cap
      const eligible = pending.filter(
        (e) => (e.attempts ?? 0) < MAX_OUTBOX_ATTEMPTS
      );
      if (eligible.length === 0) break;

      const batch = eligible.slice(0, 20);
      if (batch.length === 0) break;

      // Mark all as in-flight (so a crash mid-batch is detectable)
      for (const entry of batch) {
        await markInFlight(entry.id);
      }

      // Re-check: some may have been marked failed by markInFlight if over cap
      const stillInFlight = [];
      for (const entry of batch) {
        const row = await offlineDB.outbox.get(entry.id);
        if (row && row.status === "in_flight") {
          stillInFlight.push(entry);
        } else if (row && row.status === "failed") {
          failed++;
          processed++;
        }
      }
      if (stillInFlight.length === 0) {
        if (batch.length < 20) break;
        continue;
      }

      try {
        const res = await fetch("/api/sync/replay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entries: stillInFlight.map((e) => ({
              id: e.id,
              action: e.action,
              entityType: e.entityType,
              entityId: e.entityId,
              payload: e.payload,
              idempotencyKey: e.idempotencyKey,
              clientId: e.clientId,
              createdAt: e.createdAt,
              baseVersion: e.baseVersion,
            })),
          }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          for (const entry of stillInFlight) {
            // Network/server errors are retriable unless attempts exhausted
            const requeued = await requeueForRetry(
              entry.id,
              `HTTP ${res.status}: ${text.slice(0, 200)}`
            );
            if (!requeued) failed++;
            processed++;
          }
          break;
        }

        const data = await res.json();
        const accepted: string[] = data.accepted ?? [];
        const rejected: Array<{ idempotencyKey: string; reason: string }> =
          data.rejected ?? [];

        for (const entry of stillInFlight) {
          const wasRejected = rejected.find(
            (r) => r.idempotencyKey === entry.idempotencyKey
          );
          if (wasRejected) {
            const reason = wasRejected.reason.toLowerCase();
            const isRetriable =
              reason.includes("conflict") ||
              reason.includes("retry") ||
              reason.includes("version");

            if (isRetriable) {
              await requeueForRetry(entry.id, wasRejected.reason);
            } else {
              await markFailure(entry.id, wasRejected.reason);
              failed++;
            }
            processed++;
          } else if (
            accepted.includes(entry.idempotencyKey) ||
            accepted.includes(entry.id)
          ) {
            await markSuccess(entry.id);
            succeeded++;
            processed++;
          } else {
            // Ambiguous — requeue for another attempt
            await requeueForRetry(entry.id, "Unacknowledged");
            processed++;
          }
        }

        if (accepted.length + rejected.length < stillInFlight.length) break;
        if (batch.length < 20) break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        for (const entry of stillInFlight) {
          const requeued = await requeueForRetry(entry.id, msg);
          if (!requeued) failed++;
          processed++;
        }
        break;
      }
    }
  } finally {
    syncInProgress = false;
  }

  return { processed, succeeded, failed };
}

/**
 * Convenience: return a promise that resolves once sync is done.
 */
export async function syncNow(): Promise<void> {
  await replayOutbox();
}

// ---------------------------------------------------------------------------
// Background daemon
// ---------------------------------------------------------------------------

let daemonTimer: number | null = null;

export function startSyncDaemon(intervalMs: number = 15000): void {
  if (daemonTimer !== null) return;

  // Immediately attempt sync when connectivity is restored
  if (!networkUnsub) {
    networkUnsub = subscribeNetwork((online) => {
      if (online) {
        void replayOutbox().catch((err) =>
          console.error("[sync] reconnect replay error:", err)
        );
      }
    });
  }

  daemonTimer = window.setInterval(async () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }
    try {
      await replayOutbox();
    } catch (err) {
      console.error("[sync] daemon error:", err);
    }
  }, intervalMs);
}

export function stopSyncDaemon(): void {
  if (daemonTimer !== null) {
    window.clearInterval(daemonTimer);
    daemonTimer = null;
  }
  if (networkUnsub) {
    networkUnsub();
    networkUnsub = null;
  }
}
