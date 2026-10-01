/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Network status detection with a small heartbeat check.
 */

"use client";

type Listener = (online: boolean) => void;

let currentOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
const listeners = new Set<Listener>();
let heartbeatTimer: number | null = null;

function notify() {
  for (const l of listeners) {
    try {
      l(currentOnline);
    } catch (err) {
      console.error("[network] listener error:", err);
    }
  }
}

function setOnline(next: boolean) {
  if (next !== currentOnline) {
    currentOnline = next;
    notify();
  }
}

// Browser events
if (typeof window !== "undefined") {
  window.addEventListener("online", () => setOnline(true));
  window.addEventListener("offline", () => setOnline(false));
}

/**
 * Start a lightweight heartbeat. Every 30s we try to fetch /api/health.
 * If it fails twice in a row, we mark as offline.
 */
export function startHeartbeat(intervalMs: number = 30000): void {
  if (heartbeatTimer !== null) return;

  let consecutiveFailures = 0;

  heartbeatTimer = window.setInterval(async () => {
    try {
      const res = await fetch("/api/health", {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        consecutiveFailures = 0;
        setOnline(true);
      } else {
        consecutiveFailures++;
        if (consecutiveFailures >= 2) setOnline(false);
      }
    } catch {
      consecutiveFailures++;
      if (consecutiveFailures >= 2) setOnline(false);
    }
  }, intervalMs);
}

export function stopHeartbeat(): void {
  if (heartbeatTimer !== null) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export function isOnline(): boolean {
  return currentOnline;
}

export function subscribeNetwork(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
