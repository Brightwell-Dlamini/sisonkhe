/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  DriverContext,
  DriverSummary,
  DriverTrip,
} from "../lib/driver/queries";

interface UseDriverSummaryResult {
  context: DriverContext | null;
  summary: DriverSummary | null;
  trips: DriverTrip[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 15000;

export function useDriverSummary(): UseDriverSummaryResult {
  const [context, setContext] = useState<DriverContext | null>(null);
  const [summary, setSummary] = useState<DriverSummary | null>(null);
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/driver/summary", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json();
      setContext(data.context);
      setSummary(data.summary);
      setTrips(data.trips ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return { context, summary, trips, loading, error, refresh };
}
