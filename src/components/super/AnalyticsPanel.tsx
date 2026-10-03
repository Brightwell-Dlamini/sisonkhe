"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, Car, Building2, BadgeCheck, TrendingUp } from "lucide-react";
import type { AnalyticsSnapshot } from "@/lib/super/analytics";

export default function AnalyticsPanel() {
  const [data, setData] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/super/analytics")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    );
  }

  const cards = [
    { label: "Vehicles", value: data.totals.vehicles, icon: Car },
    { label: "Drivers", value: data.totals.drivers, icon: Users },
    { label: "Operators", value: data.totals.operators, icon: Building2 },
    { label: "Marshals", value: data.totals.marshals, icon: BadgeCheck },
  ];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          Live Analytics
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Real-time national operations snapshot.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4"
            >
              <Icon className="w-4 h-4 text-purple-600 mb-2" />
              <div className="text-[10px] uppercase font-bold text-zinc-400">
                {c.label}
              </div>
              <div className="text-2xl font-mono font-black text-zinc-900 dark:text-white mt-1">
                {c.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white mb-3">
          Last 24 Hours
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <Stat label="Dispatches" value={data.last24h.dispatches} />
          <Stat label="Revenue" value={`E${data.last24h.revenue.toFixed(0)}`} />
          <Stat label="New Trips" value={data.last24h.newTrips} />
          <Stat label="New Incidents" value={data.last24h.newIncidents} />
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white mb-3">
          By Region
        </h3>
        <div className="space-y-2">
          {data.regions.map((r) => (
            <div
              key={r.code}
              className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
            >
              <span className="font-bold">{r.code}</span>
              <div className="flex gap-4 text-zinc-600 dark:text-zinc-400 font-mono">
                <span>{r.vehicles} vehicles</span>
                <span>{r.trips30d} trips/30d</span>
                <span className="text-emerald-600">E{r.revenue30d.toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white mb-3">
          Top Routes (Last 30 Days)
        </h3>
        {data.topRoutes.length === 0 ? (
          <div className="text-center text-xs text-zinc-500 py-4">No data yet.</div>
        ) : (
          <div className="space-y-2">
            {data.topRoutes.map((r, i) => (
              <div
                key={r.routeId}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold">
                    {i + 1}
                  </span>
                  <span className="font-bold">{r.label}</span>
                  <span className="text-zinc-500">({r.region})</span>
                </div>
                <div className="flex gap-3 font-mono text-zinc-600 dark:text-zinc-400">
                  <span>{r.trips} trips</span>
                  <span className="text-emerald-600 font-bold">E{r.revenue.toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950">
      <div className="text-[10px] uppercase font-bold text-zinc-400">{label}</div>
      <div className="text-lg font-mono font-black text-zinc-900 dark:text-white mt-0.5">
        {value}
      </div>
    </div>
  );
}
