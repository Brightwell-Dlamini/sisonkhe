/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import {
  Car,
  MapPin,
  ShieldCheck,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import type { DriverContext } from "@/lib/driver/queries";

interface Props {
  vehicle: DriverContext["vehicle"];
  marshal: DriverContext["marshal"];
  onMessageMarshal: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  Waiting: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  Loading: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  Full: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
  Departed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  Delayed: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  Breakdown: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
};

export default function DriverVehicleCard({
  vehicle,
  marshal,
  onMessageMarshal,
}: Props) {
  if (!vehicle) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center">
        <Car className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
        <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
          No vehicle assigned
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          Contact your fleet manager to be assigned a vehicle.
        </div>
      </div>
    );
  }

  const isLead = vehicle.currentQueuePosition === 1;

  return (
    <div
      className={`bg-white dark:bg-zinc-900 border rounded-2xl p-5 ${
        isLead
          ? "border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="font-mono font-black text-zinc-900 dark:text-white text-lg">
              {vehicle.registrationNumber}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
              {vehicle.vic && (
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
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
            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_STYLES[vehicle.status] ?? ""}`}
          >
            {vehicle.status}
          </span>
          {isLead && (
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
              LEAD VEHICLE
            </div>
          )}
        </div>
      </div>

      {/* Route + Bay row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs">
        {vehicle.routeOrigin && vehicle.routeDestination && (
          <div className="col-span-2 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-zinc-700 dark:text-zinc-300">
              <strong>{vehicle.routeOrigin}</strong> → {vehicle.routeDestination}
            </span>
          </div>
        )}
        {vehicle.loadingBay && (
          <div className="text-right">
            <span className="text-zinc-500">Bay: </span>
            <strong className="font-mono text-zinc-900 dark:text-white">
              {vehicle.loadingBay}
            </strong>
          </div>
        )}
      </div>

      {/* Queue position (if in queue) */}
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

      {/* Permit status */}
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

      {/* Marshal contact */}
      {marshal && (
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-black text-zinc-400">
              Station Marshal
            </div>
            <div className="text-xs font-bold text-zinc-900 dark:text-white">
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

      {/* Offline warning */}
      {vehicle.status === "Breakdown" && (
        <div className="mt-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            This vehicle is marked as <strong>Breakdown</strong>. Contact the
            marshal.
          </span>
        </div>
      )}
    </div>
  );
}
