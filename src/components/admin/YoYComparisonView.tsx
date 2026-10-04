"use client";

import { useCallback, useEffect, useState } from "react";
import { Scale, TrendingUp, TrendingDown } from "lucide-react";
import type { YoYView } from "@/lib/admin/yoy";
import {
  Select,
  Input,
  PageHeader,
  TableSkeleton,
  EmptyState,
} from "@/components/ui";

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
    <div>
      <PageHeader
        title="Year-over-Year Comparison"
        description="Compare corridor performance across years."
      />

      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-3 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Select value={routeId} onChange={(e) => setRouteId(e.target.value)}>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.region}: {r.origin} → {r.destination}
            </option>
          ))}
        </Select>
        <Input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          placeholder="Year A"
          className="font-mono"
        />
        <Input
          type="number"
          value={compareYear}
          onChange={(e) => setCompareYear(Number(e.target.value))}
          placeholder="Year B"
          className="font-mono"
        />
      </div>

      {loading ? (
        <TableSkeleton rows={3} />
      ) : view ? (
        <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-black uppercase text-white">
              {view.routeLabel} — {view.year} vs {view.compareYear}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {view.metrics.map((m) => {
              const positive = m.delta >= 0;
              return (
                <div
                  key={m.label}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                >
                  <div className="text-[10px] uppercase font-bold text-zinc-400">
                    {m.label}
                  </div>
                  <div className="text-2xl font-mono font-black text-white mt-1">
                    {m.thisYear.toLocaleString()}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-zinc-500">
                      prev: {m.lastYear.toLocaleString()}
                    </span>
                    <span
                      className={`font-bold flex items-center gap-1 ${
                        positive ? "text-emerald-400" : "text-rose-400"
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
      ) : (
        <EmptyState
          icon={Scale}
          title="Select a route"
          description="Choose a corridor and years to compare."
        />
      )}
    </div>
  );
}
