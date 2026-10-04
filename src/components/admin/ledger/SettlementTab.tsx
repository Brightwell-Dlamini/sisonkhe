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

export default function SettlementTab() {
  const [filters, setFilters] = useState<LedgerFilters>({});
  const { data, loading, error, refresh } = useSettlement(filters);

  return (
    <div className="space-y-4">
      <FilterBar filters={filters} onChange={setFilters} onRefresh={refresh} loading={loading} />

      {error && (
        <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        </div>
      ) : data ? (
        <SettlementCards data={data} />
      ) : (
        <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl text-center py-16 text-sm text-zinc-500">
          No settlement data for this period
        </div>
      )}
    </div>
  );
}
