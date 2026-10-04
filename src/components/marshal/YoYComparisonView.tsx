"use client";

import { useMemo } from "react";
import { Scale } from "lucide-react";
import type { RouteRoster } from "@/lib/marshal/roster";

interface Props {
  roster: RouteRoster | null;
}

export default function YoYComparisonView({ roster }: Props) {
  const monthlyStats = useMemo(() => {
    if (!roster) return null;
    return {
      leadVehicle: roster.vehicles[0]?.registrationNumber ?? "—",
      totalVehicles: roster.vehicles.length,
      totalDays: roster.totalDays,
      midMonth: roster.dailyRoster[0]?.vehicles.filter((v) => v.isMidMonth).length ?? 0,
    };
  }, [roster]);

  if (!monthlyStats || !roster) {
    return (
      <div className="text-xs text-zinc-500 text-center py-12">No roster data.</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Scale className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-black uppercase text-white">
            Rotation Summary — {roster.monthName}
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Card label="Lead Vehicle" value={monthlyStats.leadVehicle} mono />
          <Card label="Total Vehicles" value={String(monthlyStats.totalVehicles)} />
          <Card label="Cycle Days" value={String(monthlyStats.totalDays)} />
          <Card label="Mid-Month Additions" value={String(monthlyStats.midMonth)} />
        </div>
      </div>

      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5">
        <h4 className="text-xs font-black uppercase tracking-wider text-white mb-3">
          Sequence Snapshot
        </h4>
        <p className="text-xs text-zinc-500 mb-3">
          Every vehicle will serve as lead exactly once per {monthlyStats.totalVehicles}-cycle period.
        </p>
        <div className="space-y-1.5">
          {roster.vehicles.map((v) => (
            <div
              key={v.registrationNumber}
              className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]"
            >
              <span className="font-mono font-bold text-zinc-200">
                #{v.position} {v.registrationNumber}
              </span>
              <span className="text-zinc-500">{v.driverName ?? "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
      <div className="text-[10px] uppercase font-bold text-zinc-500">{label}</div>
      <div className={`text-sm font-black text-white mt-0.5 ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}
