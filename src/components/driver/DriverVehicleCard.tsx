"use client";

import {
  Car,
  MapPin,
  ShieldCheck,
  MessageSquare,
  Moon,
  Sparkles,
} from "lucide-react";
import type { DriverContext } from "@/lib/driver/queries";
import type { DriverSignalKind } from "@/hooks/useDriverSignal";
import { driverCoach } from "@/lib/domain/driverCoach";
import { StatusDot, statusToneFromLabel } from "@/components/ui";
import DriverSignalPanel from "./DriverSignalPanel";

interface Props {
  vehicle: DriverContext["vehicle"];
  marshal: DriverContext["marshal"];
  onMessageMarshal: () => void;
  onEmitSignal: (
    kind: DriverSignalKind,
    note?: string
  ) => Promise<{ ok: boolean; queued?: boolean; error?: string }>;
  online: boolean;
  pendingSignalCount: number;
  isAfter830PM?: boolean;
}

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
      <div className="surface-raised p-8 text-center">
        <Car className="w-8 h-8 mx-auto text-zinc-600 mb-3" />
        <div className="text-title">No vehicle assigned</div>
        <p className="text-body mt-2 max-w-sm mx-auto">
          Contact your fleet manager to be assigned a vehicle.
        </p>
      </div>
    );
  }

  const isLead = vehicle.currentQueuePosition === 1;
  const coach = driverCoach({
    status: vehicle.status,
    currentQueuePosition: vehicle.currentQueuePosition,
    hasVehicle: true,
    routeOrigin: vehicle.routeOrigin,
    routeDestination: vehicle.routeDestination,
  });

  return (
    <div className="space-y-3">
      {isAfter830PM && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-950/40 px-3.5 py-3 flex items-center gap-2.5 text-sm text-violet-100">
          <Moon className="w-4 h-4 text-violet-300 shrink-0" />
          <span>
            After 8:30 PM — queue advances to tomorrow&apos;s rotation.
          </span>
        </div>
      )}

      <div
        className={`surface-raised p-4 sm:p-5 ${
          isLead ? "border-emerald-500/60 ring-2 ring-emerald-500/20" : ""
        }`}
      >
        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-meta text-emerald-300">
              <Sparkles className="h-4 w-4" />
              Next action
            </div>
            <span className="text-sm font-semibold text-emerald-100">
              {coach.primaryLabel}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-200">
            {coach.coachLine}
          </p>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-sky-950/60 text-sky-300 flex items-center justify-center shrink-0">
              <Car className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-lg sm:text-xl font-bold text-white tracking-tight">
                {vehicle.registrationNumber}
              </div>
              <div className="flex items-center gap-2 text-meta mt-0.5 flex-wrap">
                {vehicle.vic && (
                  <span className="font-mono font-semibold text-emerald-400">
                    {vehicle.vic}
                  </span>
                )}
                <span>
                  {vehicle.make} {vehicle.model}
                </span>
              </div>
              <div className="text-meta mt-1">
                {vehicle.seatingCapacity} seats · {vehicle.classification}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0 space-y-1">
            <StatusDot
              tone={statusToneFromLabel(vehicle.status)}
              label={vehicle.status}
            />
            {isLead && <StatusDot tone="ok" label="Lead vehicle" />}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/[0.06] text-sm">
          {vehicle.routeOrigin && vehicle.routeDestination && (
            <div className="sm:col-span-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-zinc-300">
                <strong className="text-white">{vehicle.routeOrigin}</strong> to{" "}
                {vehicle.routeDestination}
              </span>
            </div>
          )}
          {vehicle.loadingBay && (
            <div className="sm:text-right">
              <span className="text-zinc-500">Bay </span>
              <strong className="font-mono text-white">{vehicle.loadingBay}</strong>
            </div>
          )}
        </div>

        {vehicle.currentQueuePosition > 0 && (
          <div className="mt-3 p-3.5 rounded-xl bg-sky-950/40 border border-sky-800/50 flex items-center justify-between gap-2 text-sm">
            <span className="text-sky-100 font-semibold">
              Queue #{vehicle.currentQueuePosition}
            </span>
            <span className="text-sky-200/90">
              {isLead
                ? "Proceed to load"
                : vehicle.currentQueuePosition === 2
                  ? "Next in line"
                  : "Waiting"}
            </span>
          </div>
        )}

        {vehicle.permitNumber && (
          <div className="mt-3 flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-1.5 min-w-0">
              <ShieldCheck
                className={`w-4 h-4 shrink-0 ${
                  vehicle.permitStatus === "Active"
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              />
              <span className="text-zinc-500 truncate">
                Permit{" "}
                <strong className="font-mono text-zinc-200">
                  {vehicle.permitNumber}
                </strong>
              </span>
            </div>
            <StatusDot
              tone={statusToneFromLabel(vehicle.permitStatus ?? "")}
              label={vehicle.permitStatus ?? "—"}
            />
          </div>
        )}

        {marshal && (
          <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-meta">Station marshal</div>
              <div className="text-sm font-semibold text-white truncate">
                {marshal.fullName}
              </div>
              {marshal.phone && (
                <div className="text-meta font-mono">{marshal.phone}</div>
              )}
            </div>
            <button
              type="button"
              onClick={onMessageMarshal}
              className="min-h-11 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold flex items-center gap-2 touch-manipulation shrink-0"
            >
              <MessageSquare className="w-4 h-4" />
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
            currentQueuePosition={vehicle.currentQueuePosition}
            routeOrigin={vehicle.routeOrigin}
            routeDestination={vehicle.routeDestination}
            hasVehicle
          />
        </div>
      </div>
    </div>
  );
}
