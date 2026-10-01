/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useEffect, useState } from "react";
import {
  Radio,
  Clock,
  Calculator,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import type { KioskSnapshot } from "@/lib/public/kiosk";

interface Props {
  snapshot: KioskSnapshot;
  onRegionChange: (region: string) => void;
  onRefresh: () => void;
  onOpenFareCalculator: () => void;
  onOpenLostProperty: () => void;
}

export default function KioskHeader({
  snapshot,
  onRegionChange,
  onRefresh,
  onOpenFareCalculator,
  onOpenLostProperty,
}: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const config = snapshot.regionConfig;

  return (
    <header className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Identity */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-mono">
                SISONKHE IN TRANSIT
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                LIVE
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white uppercase font-space tracking-tight mt-0.5">
              {config?.terminalName ?? `${snapshot.region} Terminal`}
            </h1>
          </div>
        </div>

        {/* Region pills */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-2xl overflow-x-auto scrollbar-none border border-zinc-200 dark:border-zinc-700/60">
          {snapshot.regions.map((region) => (
            <button
              key={region}
              onClick={() => onRegionChange(region)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                snapshot.region === region
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm font-black"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {region}
            </button>
          ))}
        </div>

        {/* Clock + actions */}
        <div className="flex items-center gap-2">
          <div className="text-right font-mono pr-2 border-r border-zinc-200 dark:border-zinc-800 hidden sm:block">
            <div className="text-sm font-black text-zinc-900 dark:text-white flex items-center justify-end gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              {now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
            <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">
              SZ Time
            </span>
          </div>

          <button
            onClick={onOpenFareCalculator}
            className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer"
            title="Fare Guide"
          >
            <Calculator className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenLostProperty}
            className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 cursor-pointer"
            title="Report Lost Item"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
