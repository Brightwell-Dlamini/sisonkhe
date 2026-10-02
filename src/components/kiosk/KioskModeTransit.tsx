/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useMemo, useState } from "react";
import {
  MapPin,
  Search,
  Grid3x3,
  List,
  Volume2,
  Clock,
} from "lucide-react";
import type { KioskSnapshot, PublicVehicle, PublicRoute } from "@/lib/public/kiosk";
import { useAutoCycle } from "@/hooks/useAutoCycle";

interface Props {
  snapshot: KioskSnapshot;
  onSpeak?: (text: string) => void;
  voiceEnabled?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  Loading:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
  Waiting:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800",
  Full: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800",
  Departed:
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700",
  Delayed:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800",
  Breakdown:
    "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  Loading: "BOARDING NOW",
  Waiting: "WAITING",
  Full: "CABIN FULL",
  Departed: "DEPARTED",
  Delayed: "DELAYED",
  Breakdown: "BREAKDOWN",
};

const PAGE_SIZE = 10;

export default function KioskModeTransit({ snapshot, onSpeak, voiceEnabled }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "board">("cards");

  // Group vehicles by route
  const grouped = useMemo(() => {
    const map = new Map<string, PublicVehicle[]>();
    for (const v of snapshot.vehicles) {
      if (!v.routeId) continue;
      const existing = map.get(v.routeId) ?? [];
      existing.push(v);
      map.set(v.routeId, existing);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const aPos = a.currentQueuePosition > 0 ? a.currentQueuePosition : 999;
        const bPos = b.currentQueuePosition > 0 ? b.currentQueuePosition : 999;
        return aPos - bPos;
      });
    }
    return map;
  }, [snapshot.vehicles]);

  // Filter routes by search
  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return snapshot.routes;
    const q = searchQuery.toLowerCase();
    return snapshot.routes.filter((r) => {
      if (
        r.origin.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.region.toLowerCase().includes(q)
      ) {
        return true;
      }
      const vehicles = grouped.get(r.id) ?? [];
      return vehicles.some(
        (v) =>
          v.registrationNumber.toLowerCase().includes(q) ||
          (v.vic ?? "").toLowerCase().includes(q)
      );
    });
  }, [snapshot.routes, grouped, searchQuery]);

  // Auto-cycle: paginate through routes if there are more than PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(filteredRoutes.length / PAGE_SIZE));
  const cycling = useAutoCycle(totalPages, 12000, !searchQuery && viewMode === "cards");

  const visibleRoutes = useMemo(() => {
    if (searchQuery || viewMode === "board") return filteredRoutes;
    return filteredRoutes.slice(
      cycling.pageIndex * PAGE_SIZE,
      (cycling.pageIndex + 1) * PAGE_SIZE
    );
  }, [filteredRoutes, searchQuery, viewMode, cycling.pageIndex]);

  const handleAnnounce = (route: PublicRoute, vehicle?: PublicVehicle) => {
    if (!onSpeak) return;
    const text = vehicle
      ? `Attention commuters. Vehicle ${vehicle.registrationNumber}, route from ${route.origin} to ${route.destination}, status ${STATUS_LABELS[vehicle.status] ?? vehicle.status}. Bay ${vehicle.loadingBay ?? "unknown"}.`
      : `Route from ${route.origin} to ${route.destination}. No vehicles currently assigned.`;
    onSpeak(text);
  };

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search route, destination, or plate…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setViewMode("cards")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              viewMode === "cards"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500"
            }`}
          >
            <Grid3x3 className="w-3.5 h-3.5" />
            Cards
          </button>
          <button
            onClick={() => setViewMode("board")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              viewMode === "board"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Board
          </button>
        </div>
      </div>

      {/* Auto-cycle indicator */}
      {!searchQuery && viewMode === "cards" && totalPages > 1 && (
        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>
            Page {cycling.pageIndex + 1} / {totalPages} • auto-rotates every 12s
          </span>
          <button
            onClick={() => cycling.setPaused(!cycling.paused)}
            className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-[10px] font-bold uppercase"
          >
            {cycling.paused ? "Resume" : "Pause"}
          </button>
        </div>
      )}

      {/* Empty state */}
      {filteredRoutes.length === 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
          <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
            {searchQuery ? "No routes match your search." : "No routes configured for this region."}
          </div>
        </div>
      )}

      {/* Cards view */}
      {viewMode === "cards" &&
        visibleRoutes.map((route) => {
          const vehicles = grouped.get(route.id) ?? [];
          return (
            <TransitRouteCard
              key={route.id}
              route={route}
              vehicles={vehicles}
              voiceEnabled={voiceEnabled}
              onAnnounce={() => handleAnnounce(route, vehicles[0])}
            />
          );
        })}

      {/* Board view */}
      {viewMode === "board" && filteredRoutes.length > 0 && (
        <TransitBoardTable
          routes={filteredRoutes}
          grouped={grouped}
          voiceEnabled={voiceEnabled}
          onAnnounce={handleAnnounce}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

function TransitRouteCard({
  route,
  vehicles,
  voiceEnabled,
  onAnnounce,
}: {
  route: PublicRoute;
  vehicles: PublicVehicle[];
  voiceEnabled?: boolean;
  onAnnounce?: () => void;
}) {
  const leadVehicle = vehicles[0];
  const isBoarding = leadVehicle?.status === "Loading";
  const routeCode = useMemo(() => {
    const origin = route.origin.slice(0, 2).toUpperCase();
    const dest = route.destination.slice(0, 2).toUpperCase();
    return `${origin}·${dest}`;
  }, [route]);

  return (
    <div
      className={`bg-white dark:bg-zinc-900 border rounded-2xl p-4 sm:p-5 transition-all ${
        isBoarding
          ? "border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-mono font-black text-[11px] tracking-wider shrink-0">
            {routeCode}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {route.region} Region
              </span>
              {route.isPopular && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  HIGH FREQ
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight font-space mt-0.5 truncate">
              {route.origin} → {route.destination}
            </h3>
            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex-wrap">
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                E {route.baseFareE.toFixed(2)}
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span>{route.distanceKm} km</span>
              {leadVehicle?.loadingBay && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {leadVehicle.loadingBay}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
          {leadVehicle ? (
            <>
              <span
                className={`inline-block px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                  STATUS_STYLES[leadVehicle.status] ?? ""
                }`}
              >
                {STATUS_LABELS[leadVehicle.status] ?? leadVehicle.status}
              </span>
              {leadVehicle.driverDisplayName && (
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {leadVehicle.driverDisplayName}
                </div>
              )}
            </>
          ) : (
            <span className="inline-block px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
              No vehicles
            </span>
          )}

          {voiceEnabled && onAnnounce && (
            <button
              onClick={onAnnounce}
              className="mt-1 p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              title="Announce this route"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {vehicles.length > 1 && (
        <div className="mt-3.5 pt-3.5 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
          {vehicles.slice(1, 4).map((v) => (
            <div key={v.registrationNumber} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <span className="w-5 h-5 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[9px] font-bold font-mono">
                  {v.currentQueuePosition > 0 ? `#${v.currentQueuePosition}` : "—"}
                </span>
                <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                  {v.registrationNumber}
                </span>
                {v.vic && (
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[10px]">
                    {v.vic}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 dark:text-zinc-500 text-[10px]">
                  {v.loadingBay ?? "—"}
                </span>
                <span
                  className={`text-[10px] font-bold ${STATUS_STYLES[v.status] ? "opacity-80" : "text-zinc-400"}`}
                >
                  {v.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {vehicles.length === 0 && (
        <div className="mt-3.5 pt-3.5 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400 italic">
          Awaiting vehicle assignment.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board table
// ---------------------------------------------------------------------------

function TransitBoardTable({
  routes,
  grouped,
  voiceEnabled,
  onAnnounce,
}: {
  routes: PublicRoute[];
  grouped: Map<string, PublicVehicle[]>;
  voiceEnabled?: boolean;
  onAnnounce: (route: PublicRoute, vehicle?: PublicVehicle) => void;
}) {
  // Build rows: one per vehicle (or one per empty route)
  const rows = useMemo(() => {
    const out: Array<{ route: PublicRoute; vehicle?: PublicVehicle }> = [];
    for (const route of routes) {
      const vehicles = grouped.get(route.id) ?? [];
      if (vehicles.length === 0) {
        out.push({ route });
      } else {
        for (const v of vehicles) out.push({ route, vehicle: v });
      }
    }
    return out;
  }, [routes, grouped]);

  return (
    <div className="bg-black border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-12 bg-zinc-900 border-b border-zinc-850 px-4 py-3 font-mono text-[10px] sm:text-xs text-zinc-400 font-semibold tracking-wider uppercase">
        <div className="col-span-2">Vehicle</div>
        <div className="col-span-4">Destination</div>
        <div className="col-span-1 text-center">Bay</div>
        <div className="col-span-1 text-center">Q</div>
        <div className="col-span-2 text-center">Status</div>
        <div className="col-span-1 text-center">VIC</div>
        <div className="col-span-1 text-right">{voiceEnabled ? "🔊" : ""}</div>
      </div>

      <div className="divide-y divide-zinc-900 bg-black">
        {rows.map(({ route, vehicle }, idx) => {
          const routeCode = `${route.origin.slice(0, 2).toUpperCase()}-${route.destination.slice(0, 2).toUpperCase()}`;
          return (
            <div
              key={`${route.id}-${vehicle?.registrationNumber ?? "empty"}-${idx}`}
              className="grid grid-cols-12 px-4 py-3 items-center text-xs sm:text-sm font-mono"
            >
              <div className="col-span-2 text-yellow-500 font-bold truncate">
                {vehicle?.registrationNumber ?? "—"}
              </div>
              <div className="col-span-4 text-white truncate">
                {routeCode} • {route.origin} → {route.destination}
              </div>
              <div className="col-span-1 text-center text-zinc-300">
                {vehicle?.loadingBay ?? "—"}
              </div>
              <div className="col-span-1 text-center text-zinc-300">
                {vehicle?.currentQueuePosition && vehicle.currentQueuePosition > 0
                  ? `#${vehicle.currentQueuePosition}`
                  : "—"}
              </div>
              <div className="col-span-2 text-center">
                {vehicle ? (
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      STATUS_STYLES[vehicle.status] ?? ""
                    }`}
                  >
                    {STATUS_LABELS[vehicle.status] ?? vehicle.status}
                  </span>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </div>
              <div className="col-span-1 text-center text-emerald-500 text-xs">
                {vehicle?.vic ?? "—"}
              </div>
              <div className="col-span-1 text-right">
                {voiceEnabled && (
                  <button
                    onClick={() => onAnnounce(route, vehicle)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white"
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
