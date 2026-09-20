/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useTrips, type LedgerFilters } from "@/hooks/useLedger";
import FilterBar from "./FilterBar";
import TripsTable from "./TripsTable";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

export default function TripsTab() {
  const [filters, setFilters] = useState<LedgerFilters>({
    from: today(),
    to: today(),
  });
  const [exporting, setExporting] = useState(false);

  const { data, loading, error, page, setPage } = useTrips(filters, 50);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        from: filters.from,
        to: filters.to,
      });
      if (filters.region) params.set("region", filters.region);

      const res = await fetch(
        `/api/ledger/export/trips?${params.toString()}`
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "Export failed");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trips_${filters.from}_to_${filters.to}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onExport={handleExport}
        exporting={exporting}
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        </div>
      ) : !data || data.trips.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center py-16 px-4">
          <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
            No trips in this range
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Try a wider date range or different region.
          </div>
        </div>
      ) : (
        <>
          <TripsTable trips={data.trips} />

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3">
              <div className="text-xs text-zinc-500">
                Page <strong>{data.page}</strong> of <strong>{data.totalPages}</strong> •{" "}
                <strong>{data.total}</strong> total trips
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                  disabled={page >= data.totalPages}
                  className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
