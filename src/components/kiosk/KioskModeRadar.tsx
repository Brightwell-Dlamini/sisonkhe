"use client";

import { useMemo } from "react";
import { MapPin } from "lucide-react";
import type { KioskSnapshot, PublicVehicle, PublicRoute } from "@/lib/public/kiosk";
import StatusIndicator from "./StatusIndicator";

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
      <div className="kiosk-surface rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="kiosk-destination text-lg text-white uppercase">
              Terminal Bay Radar
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500 mt-0.5">
              Live dock status · {activeCount} / {ALL_BAYS.length} occupied
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] font-black uppercase tracking-widest">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Boarding
          </span>
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Waiting
          </span>
          <span className="flex items-center gap-1.5 text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            Vacant
          </span>
        </div>
      </div>

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
  const isWaiting = vehicle?.status === "Waiting";
  const bayNumber = bayName.replace("Bay ", "");

  return (
    <div
      className={`kiosk-surface kiosk-surface-hover kiosk-card-in rounded-2xl p-4 relative overflow-hidden transition-all ${
        isBoarding
          ? "ring-1 ring-emerald-500/50 shadow-[0_0_30px_-8px_rgba(16,185,129,0.4)]"
          : isWaiting
          ? "ring-1 ring-cyan-500/30"
          : ""
      }`}
    >
      {/* Bay number watermark */}
      <div className="absolute -top-2 -right-2 text-[80px] font-mono font-black text-white/[0.02] leading-none select-none pointer-events-none">
        {bayNumber}
      </div>

      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
            Bay
          </span>
          <span className="font-mono text-base font-black text-white tracking-wider">
            {bayNumber}
          </span>
        </div>
        {vehicle ? (
          <StatusIndicator
            status={vehicle.status}
            size="sm"
            pulse={isBoarding}
          />
        ) : (
          <span className="font-mono text-[9px] font-black uppercase tracking-widest text-zinc-700">
            Vacant
          </span>
        )}
      </div>

      {vehicle && route ? (
        <div className="relative space-y-3">
          <div>
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.15em] text-zinc-600">
              Destination
            </div>
            <div className="kiosk-destination text-base text-white uppercase truncate mt-0.5">
              {route.destination}
            </div>
            <div className="font-mono text-[10px] text-zinc-500 mt-0.5">
              from {route.origin}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.05]">
            <div>
              <div className="font-mono text-[9px] font-black uppercase tracking-wider text-zinc-600">
                Plate
              </div>
              <div className="font-mono text-xs font-black text-white">
                {vehicle.registrationNumber}
              </div>
            </div>
            {vehicle.vic && (
              <div>
                <div className="font-mono text-[9px] font-black uppercase tracking-wider text-zinc-600">
                  VIC
                </div>
                <div className="font-mono text-xs font-black text-emerald-400">
                  {vehicle.vic}
                </div>
              </div>
            )}
          </div>

          {vehicle.driverDisplayName && (
            <div className="font-sans text-[11px] text-zinc-500 truncate">
              Driver: {vehicle.driverDisplayName}
            </div>
          )}
        </div>
      ) : (
        <div className="relative py-6 text-center">
          <MapPin className="w-5 h-5 text-zinc-800 mx-auto mb-1" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-700">
            Open Dock
          </span>
        </div>
      )}
    </div>
  );
}
