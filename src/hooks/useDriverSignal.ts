"use client";

import { useCallback, useRef, useState } from "react";
import { newId } from "@/lib/domain/ulid";
import { useOnlineStatus } from "./useOnlineStatus";

export type DriverSignalKind =
  | "ready"
  | "loading"
  | "cabin_full"
  | "request_depart"
  | "delayed"
  | "breakdown"
  | "back_at_rank";

interface QueuedSignal {
  id: string;
  kind: DriverSignalKind;
  note?: string;
  occurredAt: string;
  vehicleReg: string;
  routeId: string | null;
}

interface EmitResult {
  ok: boolean;
  queued?: boolean;
  duplicate?: boolean;
  error?: string;
}

const QUEUE_KEY = "driver.signals.queue.v1";

function readQueue(): QueuedSignal[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedSignal[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

/**
 * Driver signal emitter with offline queue.
 *
 * Online:  POST /api/driver/signal → on success, optimistic "Sent"
 * Offline: enqueue locally + try to flush on next online transition
 * Duplicate flushes are safe — the server dedupes on signal id.
 */
export function useDriverSignal(vehicleReg: string | null, routeId: string | null) {
  const online = useOnlineStatus();
  const [pending, setPending] = useState<QueuedSignal[]>(() => readQueue());
  const [lastError, setLastError] = useState<string | null>(null);
  const flushingRef = useRef(false);

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    if (!online) return;
    const queue = readQueue();
    if (queue.length === 0) return;

    flushingRef.current = true;
    const survivors: QueuedSignal[] = [];

    for (const item of queue) {
      try {
        const res = await fetch("/api/driver/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signalId: item.id,
            kind: item.kind,
            note: item.note ?? null,
            occurredAt: item.occurredAt,
          }),
        });
        if (!res.ok && res.status !== 409) {
          survivors.push(item);
        }
      } catch {
        survivors.push(item);
      }
    }

    writeQueue(survivors);
    setPending(survivors);
    flushingRef.current = false;
  }, [online]);

  const emit = useCallback(
    async (kind: DriverSignalKind, note?: string): Promise<EmitResult> => {
      if (!vehicleReg) return { ok: false, error: "No vehicle assigned" };

      const item: QueuedSignal = {
        id: newId("sig"),
        kind,
        note,
        occurredAt: new Date().toISOString(),
        vehicleReg,
        routeId,
      };

      // Offline-first: always enqueue, then try to flush.
      const next = [...readQueue(), item];
      writeQueue(next);
      setPending(next);

      if (!online) return { ok: true, queued: true };

      try {
        const res = await fetch("/api/driver/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signalId: item.id,
            kind: item.kind,
            note: item.note ?? null,
            occurredAt: item.occurredAt,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setLastError(body.error ?? `HTTP ${res.status}`);
          return { ok: false, error: body.error ?? `HTTP ${res.status}` };
        }
        // Remove from queue on success
        const remaining = readQueue().filter((q) => q.id !== item.id);
        writeQueue(remaining);
        setPending(remaining);
        return { ok: true, duplicate: !!body.duplicate };
      } catch (err) {
        // Network died mid-flight — leave it queued.
        setLastError(err instanceof Error ? err.message : "Network error");
        return { ok: true, queued: true };
      }
    },
    [vehicleReg, routeId, online]
  );

  return { emit, pending, flush, online, lastError };
}
