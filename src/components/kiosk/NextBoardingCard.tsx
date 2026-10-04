"use client";

import { ArrowRight, MapPin } from "lucide-react";
import type { PublicRoute, PublicVehicle } from "@/lib/public/kiosk";

interface Props {
  route: PublicRoute;
  vehicle: PublicVehicle;
}

export default function NextBoardingCard({ route, vehicle }: Props) {
  const isBoarding = vehicle.status === "Loading";
  const statusLabel = isBoarding
    ? "Boarding now"
    : vehicle.status === "Waiting"
      ? "In queue"
      : vehicle.status === "Full"
        ? "Cabin full"
        : vehicle.status;
  const statusSub = isBoarding
    ? vehicle.expectedDepartureTime
      ? `Expected ${vehicle.expectedDepartureTime}`
      : "Board at the bay"
    : vehicle.expectedDepartureTime
      ? `Est. ${vehicle.expectedDepartureTime}`
      : vehicle.loadingBay
        ? `Hold at ${vehicle.loadingBay}`
        : "Standing by";

  return (
    <article
      className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 transition-all ${
        isBoarding
          ? "border border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 via-[#0c1410] to-[#0A0A0A] shadow-[0_0_50px_-12px_rgba(16,185,129,0.35)]"
          : "border border-white/[0.08] bg-gradient-to-r from-zinc-900/80 via-[#0c0c0c] to-[#0A0A0A]"
      }`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent to-transparent ${
          isBoarding ? "via-emerald-400" : "via-zinc-600"
        }`}
      />

      <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${
                isBoarding
                  ? "bg-emerald-500 text-black"
                  : "bg-zinc-800 text-zinc-300 border border-white/[0.08]"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isBoarding
                    ? "bg-black/70 animate-pulse"
                    : "bg-cyan-400/80"
                }`}
              />
              {isBoarding ? "Next immediate boarding" : "Next departure"}
            </span>
            {vehicle.loadingBay && (
              <span
                className={`inline-flex items-center gap-1 font-mono text-xs font-bold ${
                  isBoarding ? "text-emerald-300" : "text-zinc-400"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                {vehicle.loadingBay}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h2 className="font-space text-2xl sm:text-3xl font-bold tracking-tight text-white uppercase">
              {route.origin}
            </h2>
            <ArrowRight
              className={`w-5 h-5 shrink-0 ${
                isBoarding ? "text-emerald-400" : "text-zinc-500"
              }`}
            />
            <h2
              className={`font-space text-2xl sm:text-3xl font-bold tracking-tight uppercase ${
                isBoarding ? "text-emerald-300" : "text-zinc-200"
              }`}
            >
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
                  <span
                    className={`font-bold ${
                      isBoarding ? "text-emerald-400" : "text-zinc-300"
                    }`}
                  >
                    {vehicle.vic}
                  </span>
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

        <div
          className={`shrink-0 rounded-xl border px-5 py-4 text-center min-w-[150px] ${
            isBoarding
              ? "border-emerald-500/25 bg-emerald-950/40"
              : "border-white/[0.08] bg-black/40"
          }`}
        >
          <div className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">
            Departure status
          </div>
          <div
            className={`text-lg font-black uppercase tracking-wide ${
              isBoarding ? "text-emerald-400 led-emerald" : "text-zinc-300"
            }`}
          >
            {statusLabel}
          </div>
          <div className="mt-1 font-mono text-[11px] text-zinc-500">
            {statusSub}
          </div>
        </div>
      </div>
    </article>
  );
}
