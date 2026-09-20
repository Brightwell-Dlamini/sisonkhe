/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useSettlement, type LedgerFilters } from "@/hooks/useLedger";
import FilterBar from "./FilterBar";
import SettlementCards from "./SettlementCards";
import MarshalBreakdownTable from "./MarshalBreakdownTable";
import VehicleBreakdownTable from "./VehicleBreakdownTable";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

export default function SettlementTab() {
  const [filters, setFilters] = useState<LedgerFilters>({
    from: today(),
    to: today(),
  });
  const [exporting, setExporting] = useState(false);

  const { data, loading, error } = useSettlement(filters);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        from: filters.from,
        to: filters.to,
      });
      if (filters.region) params.set("region", filters.region);

      const res = await fetch(
        `/api/ledger/export/settlement?${params.toString()}`
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
      a.download = `settlement_${filters.from}_to_${filters.to}.csv`;
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
      ) : data ? (
        <>
          <SettlementCards summary={data} />
          <MarshalBreakdownTable marshals={data.byMarshal} />
          <VehicleBreakdownTable vehicles={data.byVehicle} />
        </>
      ) : null}
    </div>
  );
}
