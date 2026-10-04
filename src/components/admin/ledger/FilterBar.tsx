/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { Download } from "lucide-react";
import type { LedgerFilters } from "@/hooks/useLedger";
import { Button, Select, Input } from "@/components/ui";

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
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-black uppercase text-zinc-500">
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
                  ? "bg-emerald-500 text-black"
                  : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-zinc-500">From</span>
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => onChange({ ...filters, from: e.target.value })}
              className="font-mono w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-zinc-500">To</span>
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => onChange({ ...filters, to: e.target.value })}
              className="font-mono w-auto"
            />
          </div>

          {showRegionFilter && (
            <Select
              value={filters.region ?? "All"}
              onChange={(e) =>
                onChange({
                  ...filters,
                  region: e.target.value === "All" ? undefined : e.target.value,
                })
              }
              className="w-36"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          )}

          {extraFilterChips}
        </div>

        {onExport && (
          <Button
            size="sm"
            leadingIcon={Download}
            onClick={onExport}
            loading={exporting}
            className="shrink-0"
          >
            Export CSV
          </Button>
        )}
      </div>
    </div>
  );
}
