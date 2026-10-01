/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marshal terminal data hook.
 *
 * Online: fetches from the API, updates local Dexie cache.
 * Offline: serves from Dexie cache, queues dispatch actions in the outbox.
 * Auto-replays the outbox when connectivity returns.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MarshalContext,
  MarshalVehicle,
  MarshalSummary,
  MarshalActivityItem,
} from "../lib/marshal/queries";
import type { DispatchAction } from "../lib/marshal/dispatch";
import { enqueue } from "../lib/offline/outbox";
import { isOnline, subscribeNetwork } from "../lib/offline/network";
import { replayOutbox } from "../lib/offline/sync";

const POLL_INTERVAL_MS = 5000;

interface UseMarshalTerminalResult {
  context: MarshalContext | null;
  vehicles: MarshalVehicle[];
  summary: MarshalSummary | null;
  activity: MarshalActivityItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  dispatch: (
    registrationNumber: string,
    action: DispatchAction,
    reason?: string
  ) => Promise<{ success: boolean; error?: string; rankFeeWritten?: boolean }>;
}

export function useMarshalTerminal(): UseMarshalTerminalResult {
  const [context, setContext] = useState<MarshalContext | null>(null);
  const [vehicles, setVehicles] = useState<MarshalVehicle[]>([]);
  const [summary, setSummary] = useState<MarshalSummary | null>(null);
  const [activity, setActivity] = useState<MarshalActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    // If offline, skip the network call — the caller will show cached state
    if (!isOnline()) {
      setLoading(false);
      return;
    }

    try {
      const [terminalRes, activityRes] = await Promise.all([
        fetch("/api/marshal/terminal", { cache: "no-store" }),
        fetch("/api/marshal/activity?limit=10", { cache: "no-store" }),
      ]);

      if (!terminalRes.ok) {
        const body = await terminalRes.json().catch(() => ({}));
        throw new Error(
          body.error ?? `Terminal load failed (${terminalRes.status})`
        );
      }

      const terminalData = await terminalRes.json();
      setContext(terminalData.context);
      setVehicles(terminalData.vehicles ?? []);
      setSummary(terminalData.summary);

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivity(activityData.activity ?? []);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling loop
  useEffect(() => {
    void refresh();

    pollingRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
    };
  }, [refresh]);

  // Replay outbox when connectivity is restored, then refresh
  useEffect(() => {
    const unsubscribe = subscribeNetwork((online) => {
      if (online) {
        void replayOutbox().then(() => {
          void refresh();
        });
      }
    });
    return () => unsubscribe();
  }, [refresh]);

  const dispatch = useCallback(
    async (
      registrationNumber: string,
      action: DispatchAction,
      reason?: string
    ) => {
      // If offline, enqueue and return optimistic success
      if (!isOnline()) {
        await enqueue({
          action: "dispatch",
          entityType: "vehicle",
          entityId: registrationNumber,
          payload: { action, reason },
        });
        return {
          success: true,
          rankFeeWritten: action === "full_cabin" || action === "depart",
        };
      }

      // Online — try the network call
      try {
        const res = await fetch(
          `/api/marshal/vehicles/${encodeURIComponent(
            registrationNumber
          )}/dispatch`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, reason }),
          }
        );

        // If the server errored in a retriable way, queue it
        if (!res.ok) {
          if (res.status >= 500 || res.status === 408) {
            await enqueue({
              action: "dispatch",
              entityType: "vehicle",
              entityId: registrationNumber,
              payload: { action, reason },
            });
            return {
              success: true,
              rankFeeWritten: false,
            };
          }
          const data = await res.json().catch(() => ({}));
          return {
            success: false,
            error: data.error ?? "Dispatch failed",
          };
        }

        const data = await res.json();
        await refresh();
        return {
          success: true,
          rankFeeWritten: data.rankFeeWritten ?? false,
        };
      } catch {
        // Network failure — enqueue and return optimistic success
        await enqueue({
          action: "dispatch",
          entityType: "vehicle",
          entityId: registrationNumber,
          payload: { action, reason },
        });
        return {
          success: true,
          rankFeeWritten: action === "full_cabin" || action === "depart",
        };
      }
    },
    [refresh]
  );

  return {
    context,
    vehicles,
    summary,
    activity,
    loading,
    error,
    refresh,
    dispatch,
  };
}
