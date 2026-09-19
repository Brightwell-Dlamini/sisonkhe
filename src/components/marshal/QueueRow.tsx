/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import {
  Bus,
  User,
  MapPin,
  Loader2,
  CheckCircle2,
  Play,
  AlertTriangle,
  Wrench,
  RotateCcw,
} from "lucide-react";
import type { MarshalVehicle } from "@/lib/marshal/queries";
import type { DispatchAction } from "@/lib/marshal/dispatch";
import DelayReasonModal from "./DelayReasonModal";
import BreakdownModal from "./BreakdownModal";

interface Props {
  vehicle: MarshalVehicle;
  onDispatch: (
    reg: string,
    action: DispatchAction,
    reason?: string
  ) => Promise<{ success: boolean; error?: string; rankFeeWritten?: boolean }>;
  showToast: (msg: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  Waiting: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  Loading: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  Full: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
  Departed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  Delayed: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  Breakdown: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
};

export default function QueueRow({ vehicle, onDispatch, showToast }: Props) {
  const [pending, setPending] = useState<DispatchAction | null>(null);
  const [showDelay, setShowDelay] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const isQueued = vehicle.currentQueuePosition > 0;
  const isLead = vehicle.currentQueuePosition === 1;
  const isDeparted = vehicle.status === "Departed";

  const handle = async (action: DispatchAction) => {
    setPending(action);
    const res = await onDispatch(vehicle.registrationNumber, action);
    setPending(null);

    if (!res.success) {
      showToast(res.error ?? "Action failed");
      return;
    }

    if (res.rankFeeWritten) {
      showToast(`${vehicle.registrationNumber}: dispatched. Rank fee E25 recorded.`);
    } else if (action === "load") {
      showToast(`${vehicle.registrationNumber}: moved to Loading.`);
    } else if (action === "full_cabin") {
      showToast(`${vehicle.registrationNumber}: full cabin → departed.`);
    } else if (action === "depart") {
      showToast(`${vehicle.registrationNumber}: departed.`);
    } else {
      showToast(`${vehicle.registrationNumber}: updated.`);
    }
  };

  const handleDelayConfirm = async (reason: string) => {
    setShowDelay(false);
    setPending("delay");
    const res = await onDispatch(vehicle.registrationNumber, "delay", reason);
    setPending(null);
    if (res.success) showToast(`${vehicle.registrationNumber}: marked delayed.`);
    else showToast(res.error ?? "Failed");
  };

  const handleBreakdownConfirm = async (reason: string) => {
    setShowBreakdown(false);
    setPending("breakdown");
    const res = await onDispatch(vehicle.registrationNumber, "breakdown", reason);
    setPending(null);
    if (res.success) showToast(`${vehicle.registrationNumber}: marked breakdown.`);
    else showToast(res.error ?? "Failed");
  };

  return (
    <>
      <div
        className={`bg-white dark:bg-zinc-900 border rounded-2xl p-4 transition-colors ${
          isLead
            ? "border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20"
            : "border-zinc-200 dark:border-zinc-800"
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Queue position */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black shrink-0 ${
              isLead
                ? "bg-emerald-600 text-white"
                : isQueued
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                : "bg-zinc-50 dark:bg-zinc-900 text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {isQueued ? `#${vehicle.currentQueuePosition}` : "—"}
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-black text-zinc-900 dark:text-white">
                {vehicle.registrationNumber}
              </span>
              {vehicle.vic && (
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                  {vehicle.vic}
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${STATUS_STYLES[vehicle.status] ?? ""}`}
              >
                {vehicle.status}
              </span>
              {isLead && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-600 text-white">
                  Lead
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Bus className="w-3 h-3" />
                {vehicle.make} {vehicle.model} • {vehicle.seatingCapacity} seats
              </span>
              {vehicle.routeOrigin && vehicle.routeDestination && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {vehicle.routeOrigin} → {vehicle.routeDestination}
                </span>
              )}
              {vehicle.driverName && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {vehicle.driverName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1.5 flex-wrap">
          {!isDeparted && vehicle.status !== "Loading" && (
            <ActionButton
              onClick={() => handle("load")}
              pending={pending === "load"}
              icon={Play}
              label="Load"
              color="emerald"
            />
          )}

          {vehicle.status === "Loading" && (
            <>
              <ActionButton
                onClick={() => handle("full_cabin")}
                pending={pending === "full_cabin"}
                icon={CheckCircle2}
                label="Full Cabin"
                color="emerald"
                hint="E25 fee + depart"
              />
              <ActionButton
                onClick={() => handle("depart")}
                pending={pending === "depart"}
                icon={Play}
                label="Depart"
                color="blue"
                hint="E25 fee"
              />
            </>
          )}

          {!isDeparted && (
            <>
              <ActionButton
                onClick={() => setShowDelay(true)}
                pending={pending === "delay"}
                icon={AlertTriangle}
                label="Delay"
                color="amber"
              />
              <ActionButton
                onClick={() => setShowBreakdown(true)}
                pending={pending === "breakdown"}
                icon={Wrench}
                label="Breakdown"
                color="red"
              />
            </>
          )}

          {isDeparted && (
            <ActionButton
              onClick={() => handle("reset_to_waiting")}
              pending={pending === "reset_to_waiting"}
              icon={RotateCcw}
              label="Return to Queue"
              color="zinc"
            />
          )}
        </div>
      </div>

      {showDelay && (
        <DelayReasonModal
          registrationNumber={vehicle.registrationNumber}
          onCancel={() => setShowDelay(false)}
          onConfirm={handleDelayConfirm}
        />
      )}

      {showBreakdown && (
        <BreakdownModal
          registrationNumber={vehicle.registrationNumber}
          onCancel={() => setShowBreakdown(false)}
          onConfirm={handleBreakdownConfirm}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function ActionButton({
  onClick,
  pending,
  icon: Icon,
  label,
  color,
  hint,
}: {
  onClick: () => void;
  pending: boolean;
  icon: React.ElementType;
  label: string;
  color: "emerald" | "blue" | "amber" | "red" | "zinc";
  hint?: string;
}) {
  const styles: Record<string, string> = {
    emerald:
      "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600",
    blue: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600",
    amber:
      "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    red: "bg-red-50 hover:bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    zinc: "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-700",
  };

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50 ${styles[color]}`}
    >
      {pending ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Icon className="w-3 h-3" />
      )}
      <span>{label}</span>
      {hint && (
        <span className="opacity-70 text-[9px] font-normal hidden sm:inline">
          {hint}
        </span>
      )}
    </button>
  );
}
