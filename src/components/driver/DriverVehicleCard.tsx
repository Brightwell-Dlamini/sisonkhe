"use client";

import {
  Car,
  MapPin,
  ShieldCheck,
  MessageSquare,
  Moon,
} from "lucide-react";
import type { DriverContext } from "@/lib/driver/queries";
import type { DriverSignalKind } from "@/hooks/useDriverSignal";
import DriverSignalPanel from "./DriverSignalPanel";

interface Props {
  vehicle: DriverContext["vehicle"];
  marshal: DriverContext["marshal"];
  onMessageMarshal: () => void;
  onEmitSignal: (kind: DriverSignalKind, note?: string) => Promise<{
    ok: boolean;
    queued?: boolean;
    error?: string;
  }>;
  online: boolean;
  pendingSignalCount: number;
  isAfter830PM?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  Waiting:   "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  Loading:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  Departed:  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  Delayed:   "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  Breakdown: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  Offline:   "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

export default function DriverVehicleCard({
  vehicle,
  marshal,
  onMessageMarshal,
  onEmitSignal,
  online,
  pendingSignalCount,
  isAfter830PM,
}: Props) {
  if (!vehicle) {
    return (
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-6 text-center">
        <Car className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
        <div className="text-sm font-bold text-zinc-300">No vehicle assigned</div>
        <div className="text-xs text-zinc-500 mt-1">
          Contact your fleet manager to be assigned a vehicle.
        </div>
      </div>
    );
  }

  const isLead = vehicle.currentQueuePosition === 1;

  return (
    <div className="space-y-4">
      {isAfter830PM && (
        <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl p-3 flex items-center gap-2 text-xs">
          <Moon className="w-4 h-4 text-purple-400" />
          <span className="text-purple-900 dark:text-purple-200 font-bold">
            After 8:30 PM — Queue advances to tomorrow's rotation.
          </span>
        </div>
      )}

      <div
        className={`bg-[#0F0F10] border rounded-2xl p-5 ${
          isLead
            ? "border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20"
            : "border-white/[0.06]"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-cyan-400 flex items-center justify-center shrink-0">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <div className="font-mono font-black text-white text-lg">
                {vehicle.registrationNumber}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                {vehicle.vic && (
                  <span className="font-mono font-bold text-emerald-400">
                    {vehicle.vic}
                  </span>
                )}
                <span>
                  {vehicle.make} {vehicle.model}
                </span>
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {vehicle.seatingCapacity} seats • {vehicle.classification}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span
              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                STATUS_STYLES[vehicle.status] ?? ""
              }`}
            >
              {vehicle.status}
            </span>
            {isLead && (
              <div className="text-[10px] text-emerald-400 font-bold mt-1">
                LEAD VEHICLE
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/[0.06] text-xs">
          {vehicle.routeOrigin && vehicle.routeDestination && (
            <div className="col-span-2 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-zinc-300">
                <strong>{vehicle.routeOrigin}</strong> → {vehicle.routeDestination}
              </span>
            </div>
          )}
          {vehicle.loadingBay && (
            <div className="text-right">
              <span className="text-zinc-500">Bay: </span>
              <strong className="font-mono text-white">{vehicle.loadingBay}</strong>
            </div>
          )}
        </div>

        {vehicle.currentQueuePosition > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
            <span className="text-blue-800 dark:text-blue-200 font-bold">
              Queue position: <strong>#{vehicle.currentQueuePosition}</strong>
            </span>
            <span className="text-[10px] text-blue-700 dark:text-blue-300">
              {isLead
                ? "Proceed to load"
                : vehicle.currentQueuePosition === 2
                ? "Next in line"
                : "Waiting"}
            </span>
          </div>
        )}

        {vehicle.permitNumber && (
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <ShieldCheck
                className={`w-3.5 h-3.5 ${
                  vehicle.permitStatus === "Active"
                    ? "text-emerald-600"
                    : "text-amber-600"
                }`}
              />
              <span className="text-zinc-500">
                Permit:{" "}
                <strong className="font-mono text-zinc-800 dark:text-zinc-200">
                  {vehicle.permitNumber}
                </strong>
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                vehicle.permitStatus === "Active"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              }`}
            >
              {vehicle.permitStatus}
            </span>
          </div>
        )}

        {marshal && (
          <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-black text-zinc-400">
                Station Marshal
              </div>
              <div className="text-xs font-bold text-white">
                {marshal.fullName}
              </div>
              {marshal.phone && (
                <div className="text-[10px] font-mono text-zinc-500">
                  {marshal.phone}
                </div>
              )}
            </div>
            <button
              onClick={onMessageMarshal}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Message
            </button>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <DriverSignalPanel
            onEmit={onEmitSignal}
            online={online}
            pendingCount={pendingSignalCount}
            currentVehicleStatus={vehicle.status}
          />
        </div>
      </div>
    </div>
  );
}
