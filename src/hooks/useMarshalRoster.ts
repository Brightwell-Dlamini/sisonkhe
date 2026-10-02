"use client";

import { useCallback, useEffect, useState } from "react";
import type { RouteRoster } from "../lib/marshal/roster";

interface UseMarshalRosterResult {
  roster: RouteRoster | null;
  loading: boolean;
  error: string | null;
  refresh: (month?: string) => Promise<void>;
  advance: (targetMonth: string) => Promise<{ success: boolean; error?: string }>;
}

export function useMarshalRoster(month?: string): UseMarshalRosterResult {
  const [roster, setRoster] = useState<RouteRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (m?: string) => {
      setLoading(true);
      try {
        const url = new URL("/api/marshal/roster", window.location.origin);
        if (m ?? month) url.searchParams.set("month", m ?? month!);
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRoster(data.roster);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [month]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const advance = useCallback(
    async (targetMonth: string) => {
      try {
        const res = await fetch("/api/marshal/queue/advance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetMonth }),
        });
        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error };
        await refresh(targetMonth);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Network error",
        };
      }
    },
    [refresh]
  );

  return { roster, loading, error, refresh, advance };
}
