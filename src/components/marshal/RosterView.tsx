"use client";

import { useState } from "react";
import { Loader2, Calendar, RotateCw } from "lucide-react";
import { useMarshalRoster } from "@/hooks/useMarshalRoster";

export default function RosterView() {
  const now = new Date();
  const initialMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { roster, loading, error, advance } = useMarshalRoster(initialMonth);
  const [advancing, setAdvancing] = useState(false);

  const handleAdvance = async () => {
    if (!roster) return;
    const next = new Date(roster.year, roster.dailyRoster.length ? new Date(roster.year, new Date(roster.month + "-01").getMonth(), 1).getMonth() + 1 : 0, 1);
    const target = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    if (!confirm(`Advance rotation to ${target}? This moves the current #1 to the bottom.`)) return;
    setAdvancing(true);
    const res = await advance(target);
    setAdvancing(false);
    if (!res.success) alert(res.error ?? "Advance failed");
  };

  if (loading && !roster) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !roster) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl px-4 py-3 text-xs">
        {error ?? "No route assigned"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-black uppercase tracking-wide text-white">
                {roster.routeOrigin} → {roster.routeDestination}
              </h3>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {roster.monthName} • {roster.totalDays} days • Cycle ends {roster.cycleEndDate}
            </p>
          </div>
          <button
            onClick={handleAdvance}
            disabled={advancing}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            {advancing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCw className="w-3.5 h-3.5" />
            )}
            Advance Month
          </button>
        </div>
      </div>

      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5">
        <h4 className="text-xs font-black uppercase tracking-wider text-white mb-3">
          30-Day Calendar
        </h4>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-1.5">
          {roster.dailyRoster.map((day) => (
            <div
              key={day.dayNumber}
              className={`p-2 rounded-xl border text-center ${
                day.isToday
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white/[0.03] border-white/[0.06]"
              }`}
            >
              <div className="text-[9px] uppercase opacity-70 font-bold">
                {day.dayOfWeekShort}
              </div>
              <div className="text-sm font-mono font-black">
                {day.dayNumber}
              </div>
              <div className="text-[9px] font-mono opacity-75 truncate">
                {day.vehicles[0]?.vic ?? "—"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5">
        <h4 className="text-xs font-black uppercase tracking-wider text-white mb-3">
          Base Rotation Sequence
        </h4>
        <div className="space-y-2">
          {roster.vehicles.map((v) => (
            <div
              key={v.registrationNumber}
              className={`p-3 rounded-xl border flex items-center justify-between ${
                v.isLead
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300"
                  : "bg-white/[0.03] border-white/[0.06]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-[10px] ${
                    v.isLead ? "bg-emerald-600 text-white" : "bg-zinc-200 dark:bg-zinc-700"
                  }`}
                >
                  #{v.position}
                </span>
                <div>
                  <div className="font-mono font-bold text-white text-xs">
                    {v.registrationNumber}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {v.driverName ?? "Unassigned"}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">
                {v.loadingBay ?? "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
