/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
    try {
      const [terminalRes, activityRes] = await Promise.all([
        fetch("/api/marshal/terminal", { cache: "no-store" }),
        fetch("/api/marshal/activity?limit=10", { cache: "no-store" }),
      ]);

      if (!terminalRes.ok) {
        const body = await terminalRes.json().catch(() => ({}));
        throw new Error(body.error ?? `Terminal load failed (${terminalRes.status})`);
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

  useEffect(() => {
    void refresh();

    // Poll every 5 seconds while the tab is visible
    pollingRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
    };
  }, [refresh]);

  const dispatch = useCallback(
    async (
      registrationNumber: string,
      action: DispatchAction,
      reason?: string
    ) => {
      try {
        const res = await fetch(
          `/api/marshal/vehicles/${encodeURIComponent(registrationNumber)}/dispatch`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, reason }),
          }
        );
        const data = await res.json();

        if (!res.ok) {
          return { success: false, error: data.error ?? "Dispatch failed" };
        }

        // Immediately refresh so the UI updates fast
        await refresh();
        return {
          success: true,
          rankFeeWritten: data.rankFeeWritten ?? false,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Network error",
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
