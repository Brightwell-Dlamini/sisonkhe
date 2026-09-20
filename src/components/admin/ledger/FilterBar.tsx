/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { Download } from "lucide-react";
import type { LedgerFilters } from "@/hooks/useLedger";

const REGIONS = ["All", "Hhohho", "Manzini", "Lubombo", "Shiselweni"];

interface Props {
  filters: LedgerFilters;
  onChange: (next: LedgerFilters) => void;
  onExport?: () => void;
  exporting?: boolean;
  showRegionFilter?: boolean;
  extraFilterChips?: React.ReactNode;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

const PRESETS = [
  { label: "Today", from: today(), to: today() },
  { label: "Yesterday", from: daysAgo(1), to: daysAgo(1) },
  { label: "This Week", from: daysAgo(6), to: today() },
  { label: "This Month", from: daysAgo(29), to: today() },
];

export default function FilterBar({
  filters,
  onChange,
  onExport,
  exporting,
  showRegionFilter = true,
  extraFilterChips,
}: Props) {
  const applyPreset = (from: string, to: string) => {
    onChange({ ...filters, from, to });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
      {/* Presets */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-black uppercase text-zinc-400">
          Quick:
        </span>
        {PRESETS.map((p) => {
          const isActive = filters.from === p.from && filters.to === p.to;
          return (
            <button
              key={p.label}
              onClick={() => applyPreset(p.from, p.to)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Main filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-zinc-400">
              From
            </span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => onChange({ ...filters, from: e.target.value })}
              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-zinc-400">
              To
            </span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => onChange({ ...filters, to: e.target.value })}
              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {showRegionFilter && (
            <select
              value={filters.region ?? "All"}
              onChange={(e) =>
                onChange({
                  ...filters,
                  region: e.target.value === "All" ? undefined : e.target.value,
                })
              }
              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}

          {extraFilterChips}
        </div>

        {onExport && (
          <button
            onClick={onExport}
            disabled={exporting}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        )}
      </div>
    </div>
  );
}
