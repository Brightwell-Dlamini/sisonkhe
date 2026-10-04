"use client";

import { ArrowRight, MapPin } from "lucide-react";
import type { PublicRoute, PublicVehicle } from "@/lib/public/kiosk";

interface Props {
  route: PublicRoute;
  vehicle: PublicVehicle;
}

/**
 * Hero card for the vehicle currently loading / next to board.
 */
export default function NextBoardingCard({ route, vehicle }: Props) {
  const isBoarding = vehicle.status === "Loading";

  return (
    <article className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 via-[#0c1410] to-[#0A0A0A] p-5 sm:p-6 shadow-[0_0_50px_-12px_rgba(16,185,129,0.35)]">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

      <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-black">
              <span className="h-1.5 w-1.5 rounded-full bg-black/70 animate-pulse" />
              {isBoarding ? "Next immediate boarding" : "Next departure"}
            </span>
            {vehicle.loadingBay && (
              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-300">
                <MapPin className="w-3.5 h-3.5" />
                {vehicle.loadingBay}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
              {route.origin}
            </h2>
            <ArrowRight className="w-5 h-5 text-emerald-400 shrink-0" />
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-300 uppercase">
              {route.destination}
            </h2>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-zinc-400">
            <span>
              Vehicle:{" "}
              <span className="text-white font-bold">
                {vehicle.registrationNumber}
              </span>
            </span>
            {vehicle.vic && (
              <>
                <span className="text-zinc-700">·</span>
                <span>
                  Fleet:{" "}
                  <span className="text-emerald-400 font-bold">{vehicle.vic}</span>
                </span>
              </>
            )}
            <span className="text-zinc-700">·</span>
            <span>
              Gazetted Fare:{" "}
              <span className="text-white font-bold">
                E {route.baseFareE.toFixed(2)}
              </span>
            </span>
            {route.distanceKm > 0 && (
              <>
                <span className="text-zinc-700">·</span>
                <span>
                  Distance:{" "}
                  <span className="text-white font-bold">
                    {route.distanceKm} km
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-white/[0.08] bg-black/40 px-5 py-4 text-center min-w-[140px]">
          <div className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">
            Departure status
          </div>
          <div
            className={`text-lg font-black uppercase tracking-wide ${
              isBoarding ? "text-emerald-400" : "text-white"
            }`}
          >
            {isBoarding ? "Boarding now" : vehicle.status}
          </div>
          {vehicle.expectedDepartureTime && (
            <div className="mt-1 font-mono text-[11px] text-zinc-500">
              Expected: {vehicle.expectedDepartureTime}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
