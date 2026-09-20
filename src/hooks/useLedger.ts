/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  TripListResult,
  SettlementSummary,
} from "../lib/ledger/queries";

export interface LedgerFilters {
  from: string;
  to: string;
  region?: string;
  routeId?: string;
  vehicleReg?: string;
  driverId?: string;
}

interface UseTripsResult {
  data: TripListResult | null;
  loading: boolean;
  error: string | null;
  refresh: (page?: number) => Promise<void>;
}

export function useTrips(
  filters: LedgerFilters,
  pageSize: number = 50
): UseTripsResult & { page: number; setPage: (p: number) => void } {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TripListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (overridePage?: number) => {
      const p = overridePage ?? page;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          from: filters.from,
          to: filters.to,
          page: String(p),
          pageSize: String(pageSize),
        });
        if (filters.region) params.set("region", filters.region);
        if (filters.routeId) params.set("routeId", filters.routeId);
        if (filters.vehicleReg) params.set("vehicleReg", filters.vehicleReg);
        if (filters.driverId) params.set("driverId", filters.driverId);

        const res = await fetch(`/api/ledger/trips?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Failed (${res.status})`);
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [
      filters.from,
      filters.to,
      filters.region,
      filters.routeId,
      filters.vehicleReg,
      filters.driverId,
      pageSize,
      page,
    ]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh, page, setPage };
}

interface UseSettlementResult {
  data: SettlementSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSettlement(
  filters: LedgerFilters
): UseSettlementResult {
  const [data, setData] = useState<SettlementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        from: filters.from,
        to: filters.to,
      });
      if (filters.region) params.set("region", filters.region);

      const res = await fetch(`/api/ledger/settlement?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [filters.from, filters.to, filters.region]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
