"use client";

import { useCallback, useEffect, useState } from "react";
import type { VehicleCardSummary } from "../lib/operator/queries";

export function useOperatorFleetCards() {
  const [vehicles, setVehicles] = useState<VehicleCardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/operator/vehicles", { cache: "no-store" });
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

  return { vehicles, loading, error, refresh };
}
