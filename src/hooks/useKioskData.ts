/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client hook for the public kiosk.
 *
 * Fetches the curated snapshot every 8s while the tab is visible.
 * Falls back to the last known good snapshot if a fetch fails.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KioskSnapshot } from "../lib/public/kiosk";

const POLL_INTERVAL_MS = 8000;

interface UseKioskDataResult {
  snapshot: KioskSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setRegion: (region: string) => void;
  lastUpdatedAt: number | null;
}

export function useKioskData(
  initialRegion: string = "Hhohho"
): UseKioskDataResult {
  const [region, setRegion] = useState(initialRegion);
  const [snapshot, setSnapshot] = useState<KioskSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const pollingRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/public/kiosk?region=${encodeURIComponent(region)}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Kiosk fetch failed (${res.status})`);
      }

      const data: KioskSnapshot = await res.json();
      setSnapshot(data);
      setLastUpdatedAt(Date.now());
      setError(null);
    } catch (err) {
      // Keep last good snapshot; just surface the error
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [region]);

  // Immediate fetch when region changes
  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  // Poll while visible
  useEffect(() => {
    if (pollingRef.current) window.clearInterval(pollingRef.current);

    pollingRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
    };
  }, [refresh]);

  // Refetch when tab becomes visible after being hidden
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [refresh]);

  return {
    snapshot,
    loading,
    error,
    refresh,
    setRegion,
    lastUpdatedAt,
  };
}
