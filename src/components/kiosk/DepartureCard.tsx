"use client";

import { Clock, MapPin, User } from "lucide-react";
import type { PublicVehicle, PublicRoute } from "@/lib/public/kiosk";
import RoutePill from "./RoutePill";
import StatusIndicator from "./StatusIndicator";
import OccupancyBar from "./OccupancyBar";
import DestinationHero from "./DestinationHero";

interface Props {
  route: PublicRoute;
  vehicles: PublicVehicle[];
  onSpeak?: () => void;
  voiceEnabled?: boolean;
  prominent?: boolean;
}

export default function DepartureCard({
  route,
  vehicles,
  onSpeak,
  voiceEnabled,
  prominent = false,
}: Props) {
  const lead = vehicles[0];
  const isBoarding = lead?.status === "Loading";
  const isFull = lead?.status === "Full";
  const isDelayed = lead?.status === "Delayed";
  const isDeparted = lead?.status === "Departed";

  const routeCode = makeRouteCode(route.origin, route.destination);
  const tone = regionTone(route.region);

  // Simulated occupancy — real value comes from the API later
  const seatsTotal = lead?.seatingCapacity ?? 15;
  const seatsFilled = isBoarding
    ? Math.min(seatsTotal, 12 + ((lead?.currentQueuePosition ?? 0) % 3))
    : isFull
    ? seatsTotal
    : isDeparted
    ? seatsTotal
    : Math.min(seatsTotal - 1, 4 + ((lead?.currentQueuePosition ?? 0) % 6));

  const departingInMin = estimatedDepartureMinutes(lead);

  return (
    <article
      className={`kiosk-surface kiosk-surface-hover kiosk-card-in rounded-2xl overflow-hidden transition-all ${
        isBoarding ? "ring-1 ring-emerald-500/40 shadow-[0_0_40px_-10px_rgba(16,185,129,0.35)]" : ""
      }`}
    >
      {/* Top status bar — visible only when boarding */}
      {isBoarding && (
        <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500" />
      )}

      <div className={`p-5 sm:p-6 ${prominent ? "sm:p-7" : ""}`}>
        {/* Row 1 — route code + destination + status */}
        <div className="flex items-start gap-4 sm:gap-5">
          <RoutePill
            code={routeCode}
            size={prominent ? "xl" : "lg"}
            tone={tone}
          />

          <div className="flex-1 min-w-0">
            <DestinationHero
              origin={route.origin}
              destination={route.destination}
              region={route.region}
              prominent={prominent}
            />
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="font-mono text-xs font-black text-emerald-400 tracking-tight">
                E {route.baseFareE.toFixed(2)}
              </span>
              <span className="text-zinc-700">·</span>
              <span className="font-mono text-xs text-zinc-400">
                {route.distanceKm} km
              </span>
              {lead?.loadingBay && (
                <>
                  <span className="text-zinc-700">·</span>
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-zinc-300 font-bold">
                    <MapPin className="w-3 h-3" />
                    {lead.loadingBay}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right column — status + departure time */}
          <div className="text-right shrink-0">
            {lead ? (
              <>
                <StatusIndicator
                  status={lead.status}
                  size={prominent ? "lg" : "md"}
                  pulse={isBoarding}
                />
                {!isDeparted && (
                  <div className="mt-2 font-mono tabular-nums">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
                      Departs
                    </div>
                    <div
                      className={`text-lg font-black tracking-tight ${
                        isBoarding ? "text-emerald-400" : "text-zinc-100"
                      }`}
                    >
                      {lead.expectedDepartureTime ?? "—:—"}
                    </div>
                    {departingInMin !== null && departingInMin > 0 && (
                      <div className="text-[10px] font-mono text-zinc-500 tabular-nums">
                        in {departingInMin}m
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <StatusIndicator status="Offline" />
            )}
          </div>
        </div>

        {/* Row 2 — the vehicle details */}
        {lead && !isDeparted && (
          <div className="mt-5 pt-5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap min-w-0">
              <KV label="Vehicle" value={lead.registrationNumber} mono bold />
              {lead.vic && <KV label="Fleet VIC" value={lead.vic} mono accent />}
              {lead.driverDisplayName && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <User className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span className="font-sans text-xs text-zinc-400 truncate">
                    {lead.driverDisplayName}
                  </span>
                </div>
              )}
            </div>

            <div className="w-full sm:w-52 shrink-0">
              <OccupancyBar
                filled={seatsFilled}
                total={seatsTotal}
                boarding={isBoarding}
              />
            </div>
          </div>
        )}

        {/* Row 3 — queue (upcoming vehicles on same route) */}
        {vehicles.length > 1 && (
          <div className="mt-4 pt-4 border-t border-white/[0.04] flex items-center gap-3 overflow-x-auto scrollbar-none">
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600 shrink-0">
              Next in queue
            </span>
            {vehicles.slice(1, 5).map((v, idx) => (
              <div
                key={v.registrationNumber}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/60 border border-white/[0.04] shrink-0"
              >
                <span className="font-mono text-[10px] font-black text-zinc-500">
                  #{v.currentQueuePosition || idx + 2}
                </span>
                <span className="font-mono text-[11px] font-bold text-zinc-200">
                  {v.registrationNumber}
                </span>
              </div>
            ))}
            {vehicles.length > 5 && (
              <span className="font-mono text-[10px] text-zinc-600 shrink-0">
                +{vehicles.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function KV({
  label,
  value,
  mono = false,
  bold = false,
  accent = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[9px] font-black uppercase tracking-[0.15em] text-zinc-600">
        {label}
      </div>
      <div
        className={`text-sm truncate ${
          mono ? "font-mono" : "font-sans"
        } ${bold ? "font-black" : "font-bold"} ${
          accent ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function makeRouteCode(origin: string, destination: string): string {
  const o = origin.slice(0, 2).toUpperCase();
  const d = destination.slice(0, 2).toUpperCase();
  return `${o}·${d}`;
}

function regionTone(region: string): "emerald" | "cyan" | "amber" | "violet" {
  switch (region) {
    case "Hhohho":
      return "emerald";
    case "Manzini":
      return "cyan";
    case "Lubombo":
      return "amber";
    case "Shiselweni":
      return "violet";
    default:
      return "emerald";
  }
}

function estimatedDepartureMinutes(vehicle?: PublicVehicle): number | null {
  if (!vehicle || !vehicle.expectedDepartureTime) return null;
  const [h, m] = vehicle.expectedDepartureTime.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  const diff = Math.round((target.getTime() - now.getTime()) / 60000);
  return diff > 0 ? diff : null;
}
