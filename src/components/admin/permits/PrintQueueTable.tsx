/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Printer,
  Search,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface VehicleOption {
  registrationNumber: string;
  vic: string | null;
  make: string;
  model: string;
  permitNumber: string | null;
  permitStatus: string | null;
  permitExpiryDate: string | null;
}

export default function PrintQueueTable() {
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/vehicles", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load vehicles");
        const data = await res.json();
        setVehicles(
          (data.vehicles ?? []).map((v: any) => ({
            registrationNumber: v.registrationNumber,
            vic: v.vic,
            make: v.make,
            model: v.model,
            permitNumber: v.permitNumber,
            permitStatus: v.permitStatus,
            permitExpiryDate: v.permitExpiryDate,
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return vehicles;
    const q = search.toLowerCase();
    return vehicles.filter(
      (v) =>
        v.registrationNumber.toLowerCase().includes(q) ||
        (v.vic ?? "").toLowerCase().includes(q) ||
        (v.permitNumber ?? "").toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q)
    );
  }, [vehicles, search]);

  const toggle = (reg: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(reg)) next.delete(reg);
      else next.add(reg);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((v) => v.registrationNumber)));
    }
  };

  const openSingle = (reg: string) => {
    window.open(
      `/print/permit/${encodeURIComponent(reg)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const openBatch = () => {
    if (selected.size === 0) return;
    const regs = Array.from(selected).join(",");
    window.open(
      `/print/batch?regs=${encodeURIComponent(regs)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by plate, VIC, permit, make…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500">
            {selected.size} selected
          </span>
          <button
            onClick={openBatch}
            disabled={selected.size === 0}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Batch Print ({selected.size})
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center py-16 px-4">
          <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
            No matching vehicles
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/50">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filtered.length > 0 && selected.size === filtered.length
                      }
                      onChange={selectAll}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">VIC</th>
                  <th className="px-4 py-3">Permit</th>
                  <th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3 w-40"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr
                    key={v.registrationNumber}
                    className="border-b border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-950/50"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(v.registrationNumber)}
                        onChange={() => toggle(v.registrationNumber)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-zinc-900 dark:text-white">
                        {v.registrationNumber}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {v.make} {v.model}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400 text-[11px]">
                      {v.vic ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-700 dark:text-zinc-300 text-[11px]">
                      {v.permitNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-700 dark:text-zinc-300 text-[11px]">
                      {v.permitExpiryDate ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openSingle(v.registrationNumber)}
                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1.5"
                      >
                        <Printer className="w-3 h-3" />
                        Print
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
