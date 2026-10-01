/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Route, Vehicle, KombiStatus, Driver } from "../../types";
import {
  Radio,
  Clock,
  MapPin,
  Users,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Phone,
  Sparkles,
  Info
} from "lucide-react";

interface TransitDepartureCardProps {
  key?: React.Key;
  route: Route;
  activeVehicle?: Vehicle;
  queuedVehicles: Vehicle[];
  driver?: Driver;
  countdownMinutes: number;
  isBoardingNow: boolean;
  onSelectRoute?: (routeId: string) => void;
  onOpenFareCalculator?: (route: Route) => void;
}

export default function TransitDepartureCard({
  route,
  activeVehicle,
  queuedVehicles,
  driver,
  countdownMinutes,
  isBoardingNow,
  onSelectRoute,
  onOpenFareCalculator
}: TransitDepartureCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Derive route theme color from region or route ID
  const getRouteBadgeStyle = () => {
    switch (route.region) {
      case "Hhohho":
        return "bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20";
      case "Manzini":
        return "bg-blue-600 text-white border-blue-500 shadow-blue-500/20";
      case "Lubombo":
        return "bg-amber-500 text-black border-amber-400 shadow-amber-500/20";
      case "Shiselweni":
        return "bg-purple-600 text-white border-purple-500 shadow-purple-500/20";
      default:
        return "bg-zinc-800 text-white border-zinc-700";
    }
  };

  // Derive route code for pill (e.g. H1, MZ, PP, LB)
  const routeCode = route.id.includes("_")
    ? route.id.split("_").slice(1).join("").toUpperCase().slice(0, 4)
    : route.origin.slice(0, 2).toUpperCase() + "-" + route.destination.slice(0, 2).toUpperCase();

  // Simulated seating capacity calculation
  const totalCapacity = activeVehicle?.seatingCapacity || 15;
  const simulatedFilledSeats = activeVehicle
    ? isBoardingNow
      ? Math.min(totalCapacity, 11 + (activeVehicle.tripsToday % 4))
      : Math.min(totalCapacity, 5 + (activeVehicle.tripsToday % 5))
    : 0;
  const seatsAvailable = Math.max(0, totalCapacity - simulatedFilledSeats);
  const fillPercentage = Math.round((simulatedFilledSeats / totalCapacity) * 100);

  // Subsequent departures simulation
  const nextDepartureTimes = [
    activeVehicle?.expectedDepartureTime || "08:45",
    "09:05",
    "09:25",
    "09:45"
  ];

  return (
    <div
      className={`rounded-2xl transition-all duration-200 border ${
        isBoardingNow
          ? "bg-white dark:bg-zinc-900/90 border-emerald-500/50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20"
          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm"
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Left: Route Badge & Main Info */}
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            {/* Transit-style Route Pill */}
            <div
              className={`px-3 py-2 rounded-xl font-mono font-black text-sm tracking-wider border shadow-sm shrink-0 flex items-center justify-center min-w-[58px] ${getRouteBadgeStyle()}`}
            >
              {routeCode}
            </div>

            {/* Destination & Corridor Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {route.region} Region • {route.origin}
                </span>
                {route.isPopular && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    High Frequency
                  </span>
                )}
              </div>

              {/* Bold Destination Headline */}
              <h3 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight truncate mt-0.5 font-space">
                {route.destination}
              </h3>

              {/* Metadata Row: Bay, Vehicle, Fare */}
              <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 flex-wrap">
                {activeVehicle && (
                  <span className="inline-flex items-center gap-1 font-bold text-zinc-900 dark:text-zinc-200">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{activeVehicle.loadingBay}</span>
                  </span>
                )}

                <span className="text-zinc-300 dark:text-zinc-700">•</span>

                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  E {route.baseFareE.toFixed(2)}
                </span>

                <span className="text-zinc-300 dark:text-zinc-700">•</span>

                <span>{route.distanceKm} km (~{Math.round(route.distanceKm * 1.1)}m)</span>

                {activeVehicle && (
                  <>
                    <span className="text-zinc-300 dark:text-zinc-700">•</span>
                    <span className="font-mono text-zinc-500">
                      {activeVehicle.registrationNumber}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Big Transit Countdown Display */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
            {isBoardingNow ? (
              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-mono font-black text-base md:text-lg animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>NOW</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mt-1 uppercase tracking-wider">
                  Boarding at {activeVehicle?.loadingBay || "Bay 01"}
                </span>
              </div>
            ) : (
              <div className="text-right">
                <div className="flex items-baseline gap-1 text-zinc-900 dark:text-white font-mono font-black text-2xl md:text-3xl">
                  <span>{countdownMinutes}</span>
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">min</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" title="Live GPS / Rank Tracking" />
                </div>
                <span className="text-[10px] font-mono text-zinc-500 block mt-0.5">
                  Departs ~{activeVehicle?.expectedDepartureTime || "08:45"}
                </span>
              </div>
            )}

            {/* Quick Actions / Toggle Details */}
            <div className="flex items-center gap-1.5 mt-2">
              {onOpenFareCalculator && (
                <button
                  onClick={() => onOpenFareCalculator(route)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs"
                  title="View fare breakdown & payment instructions"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center gap-1 cursor-pointer transition-colors"
                title="Toggle queue, driver, and upcoming departures"
              >
                <span>{isExpanded ? "Hide" : "Details"}</span>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

        </div>

        {/* Capacity Bar (Always visible for glanceability) */}
        <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="text-[11px] font-bold text-zinc-500 flex items-center gap-1">
              <Users className="w-3 h-3 text-zinc-400" />
              <span>Occupancy:</span>
            </span>
            <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  fillPercentage >= 85
                    ? "bg-rose-500"
                    : fillPercentage >= 60
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${fillPercentage}%` }}
              />
            </div>
            <span className="font-mono font-bold text-[11px] text-zinc-700 dark:text-zinc-300 shrink-0">
              {simulatedFilledSeats}/{totalCapacity} seats
            </span>
          </div>

          {/* Quick Seat Status Tag */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {seatsAvailable <= 3 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                {seatsAvailable === 0 ? "Cabin Full" : `Only ${seatsAvailable} seats left`}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {seatsAvailable} seats available
              </span>
            )}

            {/* Upcoming Departs Preview Chips */}
            <div className="hidden md:flex items-center gap-1 text-[10px] text-zinc-400">
              <span>Later:</span>
              {nextDepartureTimes.slice(1, 4).map((time, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono"
                >
                  {time}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details Drawer */}
      {isExpanded && (
        <div className="p-4 sm:p-5 bg-zinc-50 dark:bg-zinc-950/60 border-t border-zinc-200 dark:border-zinc-800 rounded-b-2xl space-y-4 text-xs animate-fade-in">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Driver & Kombi Credentials */}
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <span>Active Kombi & Driver</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="flex items-center gap-2.5">
                <img
                  src={
                    driver?.profilePictureUrl ||
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"
                  }
                  alt="Driver"
                  className="w-10 h-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <strong className="text-zinc-900 dark:text-white block font-sans">
                    {driver?.fullName || "Assigned Driver"}
                  </strong>
                  <span className="text-[10px] text-zinc-500 font-mono block">
                    Licence: {driver?.licenseClass || "Heavy Duty / PDP"}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                    {driver?.phone || "+268 7600 0000"}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 flex justify-between">
                <span>Vehicle: <strong>{activeVehicle?.registrationNumber}</strong></span>
                <span>Fleet: <strong>{activeVehicle?.fleetNumber}</strong></span>
              </div>
            </div>

            {/* Corridor Queue Sequence */}
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 md:col-span-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <span>Corridor Queue Sequence ({queuedVehicles.length} Vehicles Waiting)</span>
                <span className="text-purple-600 dark:text-purple-400 font-mono">Live Rank Rotation</span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {queuedVehicles.slice(0, 4).map((veh, idx) => (
                  <div
                    key={veh.registrationNumber}
                    className={`p-2 rounded-lg border flex items-center justify-between font-mono text-[11px] ${
                      idx === 0
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                        : idx === 1
                        ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200"
                        : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                        idx === 0 ? "bg-emerald-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
                      }`}>
                        #{idx + 1}
                      </span>
                      <strong>{veh.registrationNumber}</strong>
                      <span className="text-[10px] opacity-75">({veh.loadingBay})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold">
                        {idx === 0 ? "Loading Now" : idx === 1 ? "Standby / Next" : "Holding Lane"}
                      </span>
                      <span className="text-zinc-400">•</span>
                      <span>{veh.expectedDepartureTime || "08:45"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom quick tip for riders */}
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-500" />
              <span>Official gazetted fare E {route.baseFareE.toFixed(2)}. Cash and MTN MoMo accepted on board.</span>
            </span>
            {onSelectRoute && (
              <button
                onClick={() => onSelectRoute(route.id)}
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold font-sans cursor-pointer flex items-center gap-1"
              >
                <span>View Route Radar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
