"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Scale, TrendingUp, TrendingDown } from "lucide-react";
import type { YoYView } from "@/lib/admin/yoy";

interface RouteOption {
  id: string;
  origin: string;
  destination: string;
  region: string;
}

export default function YoYComparisonView() {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [routeId, setRouteId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [compareYear, setCompareYear] = useState(new Date().getFullYear() - 1);
  const [view, setView] = useState<YoYView | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/routes")
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
    try {
      const res = await fetch(
        `/api/admin/yoy?routeId=${encodeURIComponent(routeId)}&year=${year}&compareYear=${compareYear}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setView(data.view);
    } finally {
      setLoading(false);
    }
  }, [routeId, year, compareYear]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
          Year-over-Year Comparison
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Compare corridor performance across years.
        </p>
      </header>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={routeId}
          onChange={(e) => setRouteId(e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-bold text-zinc-900 dark:text-white"
        >
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.region}: {r.origin} → {r.destination}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-900 dark:text-white"
          placeholder="Year A"
        />
        <input
          type="number"
          value={compareYear}
          onChange={(e) => setCompareYear(Number(e.target.value))}
          className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-900 dark:text-white"
          placeholder="Year B"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : view ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white">
              {view.routeLabel} — {view.year} vs {view.compareYear}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {view.metrics.map((m) => {
              const positive = m.delta >= 0;
              return (
                <div
                  key={m.label}
                  className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                >
                  <div className="text-[10px] uppercase font-bold text-zinc-400">
                    {m.label}
                  </div>
                  <div className="text-2xl font-mono font-black text-zinc-900 dark:text-white mt-1">
                    {m.thisYear.toLocaleString()}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-zinc-500">
                      prev: {m.lastYear.toLocaleString()}
                    </span>
                    <span
                      className={`font-bold flex items-center gap-1 ${
                        positive ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {positive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {m.deltaPct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {view.metrics.every((m) => m.thisYear === 0 && m.lastYear === 0) && (
            <div className="text-center text-xs text-zinc-500 italic py-4">
              No historical data yet. Trips will accumulate over time.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
