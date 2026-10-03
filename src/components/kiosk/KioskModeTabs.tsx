"use client";

import { Radio, MapPin, Tv } from "lucide-react";
import type { KioskMode } from "@/app/kiosk/page";

interface Props {
  mode: KioskMode;
  onModeChange: (mode: KioskMode) => void;
  routeCount: number;
  vehicleCount: number;
  region: string;
}

const MODES: { id: KioskMode; label: string; short: string; icon: React.ElementType }[] = [
  { id: "transit", label: "Departures", short: "Departures", icon: Radio },
  { id: "radar", label: "Bay Radar", short: "Bays", icon: MapPin },
  { id: "tv", label: "TV Broadcast", short: "TV", icon: Tv },
];

export default function KioskModeTabs({
  mode,
  onModeChange,
  routeCount,
  vehicleCount,
  region,
}: Props) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-1 p-0.5 rounded-xl bg-zinc-900/60 border border-white/[0.05] overflow-x-auto scrollbar-none">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`px-3.5 py-2 rounded-lg font-mono text-[11px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 ${
                active
                  ? "bg-white text-black shadow-[0_0_20px_-6px_rgba(255,255,255,0.4)]"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="font-mono text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600 flex items-center gap-3">
        <span>
          <span className="text-zinc-300">{vehicleCount}</span> vehicles
        </span>
        <span className="w-1 h-1 rounded-full bg-zinc-700" />
        <span>
          <span className="text-zinc-300">{routeCount}</span> routes
        </span>
        <span className="w-1 h-1 rounded-full bg-zinc-700" />
        <span className="text-emerald-500">{region}</span>
      </div>
    </div>
  );
}
