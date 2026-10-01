/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Route, Vehicle, KombiStatus, Driver } from "../../types";
import {
  Radio,
  MapPin,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Truck,
  Sparkles,
  Info
} from "lucide-react";

interface KioskRadarBaysProps {
  vehicles: Vehicle[];
  routes: Route[];
  drivers: Driver[];
  selectedRouteId?: string;
  onSelectRoute?: (routeId: string) => void;
}

export default function KioskRadarBays({
  vehicles,
  routes,
  drivers,
  selectedRouteId,
  onSelectRoute
}: KioskRadarBaysProps) {
  const [selectedBay, setSelectedBay] = useState<string | null>(null);

  // Standard bays for terminal ranks (Bay 1 through Bay 8)
  const allBays = ["Bay 1", "Bay 2", "Bay 3", "Bay 4", "Bay 5", "Bay 6", "Bay 7", "Bay 8"];

  // Map each bay to currently active vehicle
  const bayMap = allBays.map((bayName) => {
    // Find vehicle assigned to this bay that is currently loading or waiting
    const activeVeh = vehicles.find((v) => {
      const matchBay = (v.loadingBay || "").toLowerCase().replace(/\s+/g, "") === bayName.toLowerCase().replace(/\s+/g, "");
      return matchBay && v.status !== KombiStatus.Offline && v.status !== KombiStatus.Departed;
    });

    const route = activeVeh ? routes.find((r) => r.id === activeVeh.routeAssignmentId) : undefined;
    const driver = activeVeh ? drivers.find((d) => d.id === activeVeh.driverId || d.assignedVehicleReg === activeVeh.registrationNumber) : undefined;

    // Simulate capacity
    const totalCapacity = activeVeh?.seatingCapacity || 15;
    const filledSeats = activeVeh
      ? activeVeh.status === KombiStatus.Loading
        ? Math.min(totalCapacity, 11 + (activeVeh.tripsToday % 5))
        : Math.min(totalCapacity, 6 + (activeVeh.tripsToday % 4))
      : 0;

    return {
      bayName,
      activeVeh,
      route,
      driver,
      totalCapacity,
      filledSeats,
      isBoarding: activeVeh?.status === KombiStatus.Loading,
      isStandby: activeVeh?.status === KombiStatus.Waiting && activeVeh.currentQueuePosition === 1
    };
  });

  const activeCount = bayMap.filter((b) => b.activeVeh).length;

  return (
    <div className="space-y-6">
      {/* Terminal Radar Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white uppercase font-space tracking-tight flex items-center gap-2">
                  <span>Terminal Loading Bay Radar Matrix</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                    LIVE RADAR
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Real-time spatial visualization of active loading bays, kombi dock status, and boarding progress across the rank.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs">
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Active Docks</span>
              <strong className="text-zinc-900 dark:text-white font-mono text-sm font-bold">
                {activeCount} / {allBays.length} Bays Occupied
              </strong>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs">
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Avg Loading Time</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm font-bold">
                ~12-15 Mins
              </strong>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">Boarding Now</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">Standby / Next In</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">Vacant Dock</span>
          </div>
        </div>
      </div>

      {/* Visual Spatial Bay Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {bayMap.map((bay) => {
          const isSelected = selectedBay === bay.bayName;
          const fillPercent = Math.round((bay.filledSeats / bay.totalCapacity) * 100);

          return (
            <div
              key={bay.bayName}
              onClick={() => setSelectedBay(isSelected ? null : bay.bayName)}
              className={`rounded-2xl p-4 transition-all duration-200 border cursor-pointer relative overflow-hidden ${
                bay.isBoarding
                  ? "bg-white dark:bg-zinc-900 border-emerald-500 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/20"
                  : bay.activeVeh
                  ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                  : "bg-zinc-50/50 dark:bg-zinc-900/40 border-dashed border-zinc-300 dark:border-zinc-800 opacity-80"
              } ${isSelected ? "scale-102 ring-2 ring-emerald-500 z-10" : ""}`}
            >
              {/* Bay Header & Status Tag */}
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-mono font-black text-xs text-zinc-900 dark:text-white">
                    {bay.bayName.replace("Bay ", "")}
                  </span>
                  <span className="font-mono font-black text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                    {bay.bayName}
                  </span>
                </div>

                {bay.isBoarding ? (
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 animate-pulse">
                    Boarding Now
                  </span>
                ) : bay.isStandby ? (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300">
                    Next In
                  </span>
                ) : bay.activeVeh ? (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {bay.activeVeh.status}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-zinc-100 text-zinc-400 dark:bg-zinc-800/80">
                    Vacant
                  </span>
                )}
              </div>

              {/* Bay Body */}
              {bay.activeVeh && bay.route ? (
                <div className="pt-3 space-y-2.5">
                  {/* Route Title */}
                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider block">
                      Destination Corridor
                    </span>
                    <strong className="text-sm font-black text-zinc-900 dark:text-white uppercase font-space block truncate">
                      {bay.route.origin} ➔ {bay.route.destination}
                    </strong>
                  </div>

                  {/* Vehicle Plate & Expected Departure */}
                  <div className="flex items-center justify-between font-mono text-xs text-zinc-600 dark:text-zinc-400 pt-1">
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {bay.activeVeh.registrationNumber}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Departs {bay.activeVeh.expectedDepartureTime || "08:45"}
                    </span>
                  </div>

                  {/* Boarding Occupancy Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>Cabin Occupancy</span>
                      <span>{bay.filledSeats}/{bay.totalCapacity} ({fillPercent}%)</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          fillPercent >= 85 ? "bg-rose-500" : fillPercent >= 60 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Driver Name & Action */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-600 dark:text-zinc-400 truncate max-w-[130px]">
                      Driver: <strong>{bay.driver?.fullName || "Assigned"}</strong>
                    </span>
                    {onSelectRoute && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRoute(bay.route?.id || "");
                        }}
                        className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                      >
                        Track Route
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center space-y-1.5">
                  <MapPin className="w-5 h-5 text-zinc-300 dark:text-zinc-700 mx-auto" />
                  <span className="text-xs font-bold text-zinc-400 block font-mono">
                    Dock Open
                  </span>
                  <p className="text-[10px] text-zinc-400">
                    Awaiting next scheduled kombi from holding queue.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
