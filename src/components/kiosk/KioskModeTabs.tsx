/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { Radio, MapPin, ListOrdered, Tv } from "lucide-react";
import type { KioskMode } from "@/app/kiosk/page";

interface Props {
  mode: KioskMode;
  onModeChange: (mode: KioskMode) => void;
  routeCount: number;
  vehicleCount: number;
}

const MODES: { id: KioskMode; label: string; icon: React.ElementType }[] = [
  { id: "transit", label: "Departures", icon: Radio },
  { id: "radar", label: "Bay Radar", icon: MapPin },
  { id: "queue", label: "Queue Sequence", icon: ListOrdered },
  { id: "tv", label: "TV Broadcast", icon: Tv },
];

export default function KioskModeTabs({
  mode,
  onModeChange,
  routeCount,
  vehicleCount,
}: Props) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto scrollbar-none">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                active
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="text-[11px] text-zinc-500 font-mono">
        <strong className="text-zinc-800 dark:text-zinc-200">{vehicleCount}</strong> vehicles •{" "}
        <strong className="text-zinc-800 dark:text-zinc-200">{routeCount}</strong> routes
      </div>
    </div>
  );
}
