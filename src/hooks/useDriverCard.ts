"use client";

import { useCallback, useEffect, useState } from "react";
import type { DriverVirtualCard } from "../lib/driver/queries";

interface UseDriverCardResult {
  card: DriverVirtualCard | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  topUp: (
    amount: number,
    providerId?: string,
    payerPhone?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export function useDriverCard(): UseDriverCardResult {
  const [card, setCard] = useState<DriverVirtualCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/driver/card", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 404) {
          setCard(null);
          setError("No card issued for this vehicle");
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setCard(data.card);
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

  const topUp = useCallback(
    async (amount: number, providerId = "manual", payerPhone?: string) => {
      try {
        const res = await fetch("/api/driver/card/topup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, providerId, payerPhone }),
        });
        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error };
        await refresh();
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

  return { card, loading, error, refresh, topUp };
}
