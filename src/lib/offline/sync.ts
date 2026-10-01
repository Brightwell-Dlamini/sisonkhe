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
} from "./outbox";
import { isOnline } from "./network";

let syncInProgress = false;

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
    // Loop until no more entries or we hit a failure
    while (true) {
      const pending = await listPending();
      if (pending.length === 0) break;

      const batch = pending.slice(0, 20);
      if (batch.length === 0) break;

      // Mark all as in-flight (so a crash mid-batch is detectable)
      for (const entry of batch) {
        await markInFlight(entry.id);
      }

      try {
        const res = await fetch("/api/sync/replay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entries: batch.map((e) => ({
              id: e.id,
              action: e.action,
              entityType: e.entityType,
              entityId: e.entityId,
              payload: e.payload,
              idempotencyKey: e.idempotencyKey,
              clientId: e.clientId,
              createdAt: e.createdAt,
            })),
          }),
        });

        if (!res.ok) {
          // Whole batch failed — mark all, don't loop
          const text = await res.text().catch(() => "");
          for (const entry of batch) {
            await markFailure(entry.id, `HTTP ${res.status}: ${text.slice(0, 200)}`);
            failed++;
            processed++;
          }
          break;
        }

        const data = await res.json();
        const accepted: string[] = data.accepted ?? [];
        const rejected: Array<{ idempotencyKey: string; reason: string }> =
          data.rejected ?? [];

        for (const entry of batch) {
          const wasRejected = rejected.find(
            (r) => r.idempotencyKey === entry.idempotencyKey
          );
          if (wasRejected) {
            // If the failure is permanent (e.g. validation), mark as failed.
            // If it's retriable (e.g. version conflict), let it retry.
            const isPermanent =
              !wasRejected.reason.toLowerCase().includes("conflict") &&
              !wasRejected.reason.toLowerCase().includes("retry");
            if (isPermanent) {
              await markFailure(entry.id, wasRejected.reason);
              failed++;
            } else {
              // Retriable — back to pending
              await offlineDB.outbox.update(entry.id, {
                status: "pending",
                lastError: wasRejected.reason,
              });
            }
            processed++;
          } else if (accepted.includes(entry.idempotencyKey)) {
            await markSuccess(entry.id);
            succeeded++;
            processed++;
          } else {
            // Ambiguous — leave in-flight, will retry next cycle
            await offlineDB.outbox.update(entry.id, {
              status: "pending",
              lastError: "Unacknowledged",
            });
          }
        }

        // If we processed fewer than we sent, something is wrong — stop looping
        if (accepted.length + rejected.length < batch.length) break;

        // If batch was smaller than 20, we're done
        if (batch.length < 20) break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        for (const entry of batch) {
          await markFailure(entry.id, msg);
          failed++;
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
}
