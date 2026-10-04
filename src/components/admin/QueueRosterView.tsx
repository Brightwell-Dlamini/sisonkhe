"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import type { RotationView } from "@/lib/admin/rotation";
import {
  Select,
  Button,
  IconButton,
  PageHeader,
  TableSkeleton,
  Badge,
} from "@/components/ui";

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
    <div>
      <PageHeader
        title="30-Day Rotation Queue"
        description="Full monthly cycle viewer for any route."
      />

      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-3 mb-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="flex-1 min-w-0">
          <Select value={routeId} onChange={(e) => setRouteId(e.target.value)}>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.region}: {r.origin} → {r.destination}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <IconButton
            icon={ChevronLeft}
            label="Previous month"
            onClick={() => setMonthOffset((m) => m - 1)}
          />
          <span className="text-xs font-mono font-bold text-white min-w-[100px] text-center">
            {view?.monthName ?? "—"}
          </span>
          <IconButton
            icon={ChevronRight}
            label="Next month"
            onClick={() => setMonthOffset((m) => m + 1)}
          />
          {monthOffset !== 0 && (
            <Button size="sm" onClick={() => setMonthOffset(0)}>
              Today
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl p-3 text-xs font-medium">
          {error}
        </div>
      )}

      {loading && !view ? (
        <TableSkeleton rows={6} />
      ) : view ? (
        <>
          <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-black uppercase text-white">
                {view.routeOrigin} → {view.routeDestination}
              </h3>
            </div>
            <p className="text-xs text-zinc-500">
              {view.totalDays} days · Cycle ends {view.cycleEndDate}
            </p>
          </div>

          <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5 mb-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-white mb-3">
              Calendar Grid
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-1.5">
              {view.dailyRoster.map((day) => (
                <div
                  key={day.dayNumber}
                  className={`p-2 rounded-xl border text-center ${
                    day.isToday
                      ? "bg-purple-600 text-white border-purple-500"
                      : "bg-white/[0.03] border-white/[0.06]"
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

          <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5">
            <h4 className="text-xs font-black uppercase tracking-wider text-white mb-3">
              Day-by-Day Sequence
            </h4>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {view.dailyRoster.map((day) => (
                <div
                  key={day.dayNumber}
                  className={`p-3 rounded-xl border ${
                    day.isToday
                      ? "bg-purple-500/10 border-purple-500/30"
                      : "bg-white/[0.02] border-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase text-white">
                      Day {day.dayNumber} — {day.dayOfWeekShort}
                    </span>
                    {day.isToday && (
                      <Badge variant="purple" size="sm">TODAY</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                    {day.queue.map((q) => (
                      <div
                        key={q.registrationNumber}
                        className={`p-1.5 rounded-lg text-[10px] font-mono ${
                          q.position === 1
                            ? "bg-emerald-500 text-black font-bold"
                            : "bg-white/[0.04] border border-white/[0.06] text-zinc-300"
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
