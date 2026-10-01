/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TransitApp-style departure cards. The default kiosk view.
 */

"use client";

import { useMemo } from "react";
import {
  MapPin,
  Users,
  ShieldCheck,
  Clock,
  ChevronRight,
} from "lucide-react";
import type { KioskSnapshot, PublicVehicle, PublicRoute } from "@/lib/public/kiosk";

interface Props {
  snapshot: KioskSnapshot;
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

export default function KioskModeTransit({ snapshot }: Props) {
  // Group vehicles by route
  const grouped = useMemo(() => {
    const map = new Map<string, PublicVehicle[]>();
    for (const v of snapshot.vehicles) {
      if (!v.routeId) continue;
      const existing = map.get(v.routeId) ?? [];
      existing.push(v);
      map.set(v.routeId, existing);
    }
    // Sort each group by queue position
    for (const list of map.values()) {
      list.sort((a, b) => {
        const aPos = a.currentQueuePosition > 0 ? a.currentQueuePosition : 999;
        const bPos = b.currentQueuePosition > 0 ? b.currentQueuePosition : 999;
        return aPos - bPos;
      });
    }
    return map;
  }, [snapshot.vehicles]);

  if (snapshot.routes.length === 0) {
    return <EmptyState message="No routes configured for this region." />;
  }

  return (
    <div className="space-y-3">
      {snapshot.routes.map((route) => {
        const vehicles = grouped.get(route.id) ?? [];
        return (
          <TransitRouteCard key={route.id} route={route} vehicles={vehicles} />
        );
      })}
    </div>
  );
}

function TransitRouteCard({
  route,
  vehicles,
}: {
  route: PublicRoute;
  vehicles: PublicVehicle[];
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
        {/* Left: code + route */}
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

        {/* Right: status */}
        <div className="text-right shrink-0">
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
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1.5">
                  {leadVehicle.driverDisplayName}
                </div>
              )}
            </>
          ) : (
            <span className="inline-block px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
              No vehicles
            </span>
          )}
        </div>
      </div>

      {/* Vehicle list below */}
      {vehicles.length > 1 && (
        <div className="mt-3.5 pt-3.5 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
          {vehicles.slice(1, 4).map((v, idx) => (
            <div
              key={v.registrationNumber}
              className="flex items-center justify-between text-xs"
            >
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
      <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
        {message}
      </div>
    </div>
  );
}
