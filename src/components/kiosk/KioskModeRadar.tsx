/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bay-by-bay loading grid.
 */

"use client";

import { useMemo } from "react";
import { Radio, MapPin } from "lucide-react";
import type { KioskSnapshot, PublicVehicle, PublicRoute } from "@/lib/public/kiosk";

interface Props {
  snapshot: KioskSnapshot;
}

const ALL_BAYS = [
  "Bay 01", "Bay 02", "Bay 03", "Bay 04",
  "Bay 05", "Bay 06", "Bay 07", "Bay 08",
];

export default function KioskModeRadar({ snapshot }: Props) {
  const bays = useMemo(() => {
    return ALL_BAYS.map((bayName) => {
      const vehicle = snapshot.vehicles.find(
        (v) => normalizeBay(v.loadingBay) === normalizeBay(bayName)
      );
      const route = vehicle?.routeId
        ? snapshot.routes.find((r) => r.id === vehicle.routeId)
        : undefined;
      return { bayName, vehicle, route };
    });
  }, [snapshot]);

  const activeCount = bays.filter((b) => b.vehicle).length;

  return (
    <div className="space-y-4">
      {/* Header banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight font-space">
              Terminal Loading Bay Radar
            </h2>
            <p className="text-xs text-zinc-500">
              Live dock status across {ALL_BAYS.length} bays.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">
              Occupied
            </span>
            <span className="text-lg font-black font-mono text-zinc-900 dark:text-white">
              {activeCount} / {ALL_BAYS.length}
            </span>
          </div>
        </div>
      </div>

      {/* Bay grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {bays.map((bay) => (
          <BayCard
            key={bay.bayName}
            bayName={bay.bayName}
            vehicle={bay.vehicle}
            route={bay.route}
          />
        ))}
      </div>
    </div>
  );
}

function normalizeBay(bay: string | null): string {
  return (bay ?? "").toLowerCase().replace(/\s+/g, "");
}

function BayCard({
  bayName,
  vehicle,
  route,
}: {
  bayName: string;
  vehicle?: PublicVehicle;
  route?: PublicRoute;
}) {
  const isBoarding = vehicle?.status === "Loading";

  return (
    <div
      className={`rounded-2xl p-4 transition-all border ${
        isBoarding
          ? "bg-white dark:bg-zinc-900 border-emerald-500 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/20"
          : vehicle
          ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          : "bg-zinc-50/50 dark:bg-zinc-900/40 border-dashed border-zinc-300 dark:border-zinc-800 opacity-80"
      }`}
    >
      {/* Bay header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-mono font-black text-xs text-zinc-900 dark:text-white">
            {bayName.replace("Bay ", "")}
          </span>
          <span className="font-mono font-black text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            {bayName}
          </span>
        </div>
        {isBoarding ? (
          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 animate-pulse">
            Boarding
          </span>
        ) : vehicle ? (
          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {vehicle.status}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-zinc-100 text-zinc-400 dark:bg-zinc-800/80">
            Vacant
          </span>
        )}
      </div>

      {/* Bay body */}
      {vehicle && route ? (
        <div className="pt-3 space-y-2">
          <div>
            <span className="text-[10px] font-bold uppercase text-zinc-400 block">
              Destination
            </span>
            <strong className="text-sm font-black text-zinc-900 dark:text-white uppercase font-space block truncate">
              {route.origin} → {route.destination}
            </strong>
          </div>
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="font-bold text-zinc-900 dark:text-white">
              {vehicle.registrationNumber}
            </span>
            {vehicle.vic && (
              <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">
                {vehicle.vic}
              </span>
            )}
          </div>
          {vehicle.driverDisplayName && (
            <div className="text-[10px] text-zinc-500">
              Driver: {vehicle.driverDisplayName}
            </div>
          )}
        </div>
      ) : (
        <div className="py-6 text-center space-y-1.5">
          <MapPin className="w-5 h-5 text-zinc-300 dark:text-zinc-700 mx-auto" />
          <span className="text-xs font-bold text-zinc-400 block font-mono">
            Dock Open
          </span>
        </div>
      )}
    </div>
  );
}
