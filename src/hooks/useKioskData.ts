/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client hook for the public kiosk.
 * Fetches the curated snapshot periodically while the tab is visible.
 * Does not flip loading=true on background polls (avoids full UI flash).
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
  const regionRef = useRef(region);
  regionRef.current = region;

  const refresh = useCallback(async (opts?: { showLoader?: boolean }) => {
    if (opts?.showLoader) setLoading(true);
    try {
      const res = await fetch(
        `/api/public/kiosk?region=${encodeURIComponent(regionRef.current)}`,
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
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial + region change only shows loader
  useEffect(() => {
    void refresh({ showLoader: true });
  }, [region, refresh]);

  // Background poll — no loader
  useEffect(() => {
    if (pollingRef.current) window.clearInterval(pollingRef.current);

    pollingRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh({ showLoader: false });
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
    };
  }, [refresh]);

  // Soft refetch when tab becomes visible (no loader)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        void refresh({ showLoader: false });
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [refresh]);

  return {
    snapshot,
    loading,
    error,
    refresh: () => refresh({ showLoader: false }),
    setRegion,
    lastUpdatedAt,
  };
}
