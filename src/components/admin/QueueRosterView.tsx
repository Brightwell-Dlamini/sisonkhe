"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import type { RotationView } from "@/lib/admin/rotation";

interface RouteOption {
  id: string;
  origin: string;
  destination: string;
  region: string;
}

export default function QueueRosterView() {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [routeId, setRouteId] = useState("");
  const [view, setView] = useState<RotationView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    void fetch("/api/admin/routes", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const list = (data.routes ?? []).map((r: any) => ({
          id: r.id,
          origin: r.origin,
          destination: r.destination,
          region: r.region,
        }));
        setRoutes(list);
        if (list.length > 0 && !routeId) setRouteId(list[0].id);
      });
  }, []);

  const load = useCallback(async () => {
    if (!routeId) return;
    setLoading(true);
    setError(null);
    try {
      const d = new Date();
      d.setMonth(d.getMonth() + monthOffset);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      const res = await fetch(
        `/api/admin/rotation?routeId=${encodeURIComponent(routeId)}&month=${monthStr}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setView(data.view);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown");
    } finally {
      setLoading(false);
    }
  }, [routeId, monthOffset]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
          30-Day Rotation Queue
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Full monthly cycle viewer for any route.
        </p>
      </header>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <select
          value={routeId}
          onChange={(e) => setRouteId(e.target.value)}
          className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-bold text-zinc-900 dark:text-white"
        >
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.region}: {r.origin} → {r.destination}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthOffset((m) => m - 1)}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold min-w-[100px] text-center">
            {view?.monthName ?? "—"}
          </span>
          <button
            onClick={() => setMonthOffset((m) => m + 1)}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {monthOffset !== 0 && (
            <button
              onClick={() => setMonthOffset(0)}
              className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-xs">
          {error}
        </div>
      )}

      {loading && !view ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : view ? (
        <>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white">
                {view.routeOrigin} → {view.routeDestination}
              </h3>
            </div>
            <p className="text-xs text-zinc-500">
              {view.totalDays} days • Cycle ends {view.cycleEndDate}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white mb-3">
              Calendar Grid
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-1.5">
              {view.dailyRoster.map((day) => (
                <div
                  key={day.dayNumber}
                  className={`p-2 rounded-xl border text-center ${
                    day.isToday
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="text-[9px] uppercase opacity-70 font-bold">
                    {day.dayOfWeekShort}
                  </div>
                  <div className="text-sm font-mono font-black">{day.dayNumber}</div>
                  <div className="text-[9px] font-mono opacity-75 truncate">
                    {day.leadVehicleReg ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white mb-3">
              Day-by-Day Sequence
            </h4>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {view.dailyRoster.map((day) => (
                <div
                  key={day.dayNumber}
                  className={`p-3 rounded-xl border ${
                    day.isToday
                      ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300"
                      : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase">
                      Day {day.dayNumber} — {day.dayOfWeekShort}
                    </span>
                    {day.isToday && (
                      <span className="text-[9px] font-black uppercase bg-purple-600 text-white px-2 py-0.5 rounded">
                        TODAY
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                    {day.queue.map((q) => (
                      <div
                        key={q.registrationNumber}
                        className={`p-1.5 rounded-lg text-[10px] font-mono ${
                          q.position === 1
                            ? "bg-emerald-500 text-white"
                            : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                        }`}
                      >
                        #{q.position} {q.registrationNumber}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
