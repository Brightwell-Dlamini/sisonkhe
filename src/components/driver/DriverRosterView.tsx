"use client";

import { Loader2, Calendar, Moon } from "lucide-react";
import { useDriverRoster } from "@/hooks/useDriverRoster";

export default function DriverRosterView() {
  const { roster, loading, error } = useDriverRoster();

  if (loading && !roster) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !roster) {
    return (
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-xs">
        {error ?? "Roster unavailable"}
      </div>
    );
  }

  const myToday = roster.dailyRoster.find((d) => d.isToday);
  const myTomorrow = roster.dailyRoster.find((d) => d.isTomorrow);
  const effectiveDay = roster.dailyRoster.find(
    (d) => d.dayNumber === roster.effectiveRosterDay
  );

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-black uppercase tracking-wide text-zinc-900 dark:text-white">
            {roster.routeOrigin} → {roster.routeDestination}
          </h3>
        </div>
        <p className="text-xs text-zinc-500">
          {roster.monthName} • {roster.totalDays} days • Cycle ends {roster.cycleEndDate}
        </p>

        {roster.after830PM && (
          <div className="mt-3 p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center gap-2 text-xs">
            <Moon className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-purple-900 dark:text-purple-200 font-bold">
              After 8:30 PM — showing tomorrow's effective queue.
            </span>
          </div>
        )}
      </div>

      {/* Today / Tomorrow snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {myToday && (
          <div
            className={`p-4 rounded-2xl border ${
              myToday.myIsLead
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="text-[10px] uppercase font-black tracking-widest text-zinc-400">
              Today
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-zinc-900 dark:text-white">
              {myToday.myPosition ? `#${myToday.myPosition}` : "—"}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {myToday.myMetadata || "No active position"}
            </div>
          </div>
        )}

        {myTomorrow && (
          <div
            className={`p-4 rounded-2xl border ${
              myTomorrow.myIsLead
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="text-[10px] uppercase font-black tracking-widest text-zinc-400">
              Tomorrow
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-zinc-900 dark:text-white">
              {myTomorrow.myPosition ? `#${myTomorrow.myPosition}` : "—"}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {myTomorrow.myMetadata || "No active position"}
            </div>
          </div>
        )}
      </div>

      {/* Effective cycle snapshot */}
      {effectiveDay && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white mb-3">
            {roster.after830PM ? "Effective (Tomorrow)" : "Effective (Today)"}: Day {effectiveDay.dayNumber}
          </h4>
          <div className="text-xs text-zinc-500 mb-3">
            {effectiveDay.myMetadata}
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white mb-3">
          30-Day Calendar
        </h4>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-1.5">
          {roster.dailyRoster.map((day) => {
            const isMine = day.myPosition === 1;
            return (
              <div
                key={day.dayNumber}
                className={`p-2 rounded-xl border text-center ${
                  day.isToday
                    ? "bg-blue-600 text-white border-blue-600"
                    : isMine
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300"
                    : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="text-[9px] uppercase opacity-70 font-bold">
                  {day.dayOfWeekShort}
                </div>
                <div className="text-sm font-mono font-black">
                  {day.dayNumber}
                </div>
                <div className="text-[9px] font-mono opacity-75 truncate">
                  {day.myIsLead ? "YOU" : day.leadVehicleReg ?? "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
