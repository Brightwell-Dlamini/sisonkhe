"use client";

import { useCallback, useEffect, useState } from "react";
import type { MarshalVehicle } from "../lib/marshal/queries";

interface UseMarshalVehiclesResult {
  vehicles: MarshalVehicle[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addToQueue: (reg: string) => Promise<{ success: boolean; position?: number; error?: string }>;
}

export function useMarshalVehicles(): UseMarshalVehiclesResult {
  const [vehicles, setVehicles] = useState<MarshalVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marshal/vehicles", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVehicles(data.vehicles ?? []);
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

  const addToQueue = useCallback(
    async (reg: string) => {
      try {
        const res = await fetch("/api/marshal/vehicles/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationNumber: reg }),
        });
        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error };
        await refresh();
        return { success: true, position: data.position as number };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Network error",
        };
      }
    },
    [refresh]
  );

  return { vehicles, loading, error, refresh, addToQueue };
}
