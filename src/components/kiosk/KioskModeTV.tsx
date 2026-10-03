"use client";

import { useEffect, useMemo, useState } from "react";
import type { KioskSnapshot } from "@/lib/public/kiosk";
import StatusIndicator from "./StatusIndicator";
import LiveClock from "./LiveClock";

interface Props {
  snapshot: KioskSnapshot;
}

export default function KioskModeTV({ snapshot }: Props) {
  // Flatten to rows: every vehicle is a row
  const rows = useMemo(() => {
    const out: Array<{
      routeId: string;
      routeOrigin: string;
      routeDestination: string;
      routeRegion: string;
      baseFareE: number;
      distanceKm: number;
      vehicleReg?: string;
      vic?: string | null;
      loadingBay?: string | null;
      status?: string;
      queuePos?: number;
      expectedDepartureTime?: string | null;
      driverName?: string | null;
    }> = [];

    const grouped = new Map<string, typeof snapshot.vehicles>();
    for (const v of snapshot.vehicles) {
      if (!v.routeId) continue;
      const list = grouped.get(v.routeId) ?? [];
      list.push(v);
      grouped.set(v.routeId, list);
    }

    for (const route of snapshot.routes) {
      const vehicles = grouped.get(route.id) ?? [];
      if (vehicles.length === 0) {
        out.push({
          routeId: route.id,
          routeOrigin: route.origin,
          routeDestination: route.destination,
          routeRegion: route.region,
          baseFareE: route.baseFareE,
          distanceKm: route.distanceKm,
        });
      } else {
        vehicles
          .sort(
            (a, b) =>
              (a.currentQueuePosition || 999) -
              (b.currentQueuePosition || 999)
          )
          .forEach((v) => {
            out.push({
              routeId: route.id,
              routeOrigin: route.origin,
              routeDestination: route.destination,
              routeRegion: route.region,
              baseFareE: route.baseFareE,
              distanceKm: route.distanceKm,
              vehicleReg: v.registrationNumber,
              vic: v.vic,
              loadingBay: v.loadingBay,
              status: v.status,
              queuePos: v.currentQueuePosition,
              expectedDepartureTime: v.expectedDepartureTime,
              driverName: v.driverDisplayName,
            });
          });
      }
    }
    return out;
  }, [snapshot]);

  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 12;
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paged = rows.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);

  useEffect(() => {
    if (totalPages <= 1) return;
    const t = setInterval(() => setPageIndex((i) => (i + 1) % totalPages), 10000);
    return () => clearInterval(t);
  }, [totalPages]);

  useEffect(() => {
    if (pageIndex >= totalPages) setPageIndex(0);
  }, [totalPages, pageIndex]);

  return (
    <div className="kiosk-surface rounded-2xl overflow-hidden">
      {/* Board header */}
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between bg-zinc-950/40">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-md bg-amber-500 text-black font-mono text-[10px] font-black uppercase tracking-[0.15em]">
            Live Board
          </span>
          <h2 className="kiosk-destination text-xl text-white uppercase truncate">
            {snapshot.regionConfig?.terminalName ?? `${snapshot.region} Terminal`}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <LiveClock variant="compact" />
          {totalPages > 1 && (
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.15em] text-amber-400 border border-amber-500/30 bg-amber-500/10 px-2 py-1 rounded-md tabular-nums">
              {pageIndex + 1} / {totalPages}
            </span>
          )}
        </div>
      </div>

      {/* Board columns header */}
      <div className="grid grid-cols-12 px-5 py-2.5 border-b border-white/[0.06] bg-zinc-950/30 font-mono text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
        <div className="col-span-2">Route</div>
        <div className="col-span-4">Destination</div>
        <div className="col-span-2">Vehicle</div>
        <div className="col-span-1 text-center">Bay</div>
        <div className="col-span-1 text-center">Queue</div>
        <div className="col-span-2 text-right">Status</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/[0.04]">
        {paged.length === 0 ? (
          <div className="py-20 text-center font-mono text-xs text-zinc-500 uppercase tracking-widest">
            No departures scheduled
          </div>
        ) : (
          paged.map((r, i) => {
            const routeCode = `${r.routeOrigin
              .slice(0, 2)
              .toUpperCase()}·${r.routeDestination.slice(0, 2).toUpperCase()}`;
            const isBoarding = r.status === "Loading";
            const isDelayed = r.status === "Delayed";

            return (
              <div
                key={`${r.routeId}-${r.vehicleReg ?? "empty"}-${i}`}
                className={`grid grid-cols-12 px-5 py-3 items-center transition-colors ${
                  isBoarding
                    ? "bg-emerald-500/[0.04] border-l-2 border-l-emerald-500"
                    : isDelayed
                    ? "bg-amber-500/[0.04] border-l-2 border-l-amber-500"
                    : "border-l-2 border-l-transparent hover:bg-white/[0.02]"
                }`}
              >
                <div className="col-span-2">
                  <span className="font-mono text-sm font-black tracking-wider text-zinc-200">
                    {routeCode}
                  </span>
                </div>
                <div className="col-span-4 min-w-0">
                  <div className="kiosk-destination text-lg text-white uppercase truncate">
                    {r.routeDestination}
                  </div>
                  <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                    from {r.routeOrigin} · E{r.baseFareE.toFixed(2)}
                  </div>
                </div>
                <div className="col-span-2 min-w-0">
                  {r.vehicleReg ? (
                    <>
                      <div className="font-mono text-sm font-black text-white tabular-nums truncate">
                        {r.vehicleReg}
                      </div>
                      {r.vic && (
                        <div className="font-mono text-[10px] text-emerald-500 font-bold tracking-wider">
                          {r.vic}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="font-mono text-xs text-zinc-600">—</span>
                  )}
                </div>
                <div className="col-span-1 text-center">
                  <span className="inline-block font-mono text-sm font-black text-zinc-100 bg-zinc-900 border border-white/[0.06] px-2 py-0.5 rounded-md">
                    {r.loadingBay ?? "—"}
                  </span>
                </div>
                <div className="col-span-1 text-center font-mono text-sm font-black text-zinc-400 tabular-nums">
                  {r.queuePos && r.queuePos > 0 ? `#${r.queuePos}` : "—"}
                </div>
                <div className="col-span-2 text-right">
                  {r.status ? (
                    <StatusIndicator
                      status={r.status}
                      size="sm"
                      pulse={isBoarding}
                    />
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-700">
                      No vehicle
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer page indicator */}
      {totalPages > 1 && (
        <div className="px-5 py-2.5 border-t border-white/[0.06] bg-zinc-950/40 flex items-center justify-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPageIndex(i)}
              className={`transition-all rounded-full ${
                i === pageIndex
                  ? "w-6 h-1.5 bg-emerald-500"
                  : "w-1.5 h-1.5 bg-zinc-700 hover:bg-zinc-500"
              }`}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
