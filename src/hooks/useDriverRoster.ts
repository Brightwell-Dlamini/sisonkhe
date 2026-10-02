"use client";

import { useCallback, useEffect, useState } from "react";
import type { DriverRoster } from "../lib/driver/roster";

export function useDriverRoster() {
  const [roster, setRoster] = useState<DriverRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (month?: string) => {
    setLoading(true);
    try {
      const url = new URL("/api/driver/roster", window.location.origin);
      if (month) url.searchParams.set("month", month);
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
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { roster, loading, error, refresh };
}
