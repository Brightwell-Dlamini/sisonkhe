"use client";

import { CreditCard, Snowflake } from "lucide-react";
import type { VehicleCardSummary } from "@/lib/operator/queries";

interface Props {
  vehicle: VehicleCardSummary;
  onClick: () => void;
  onQuickSend?: (reg: string) => void;
}

export default function VehicleCardMini({
  vehicle,
  onClick,
  onQuickSend,
}: Props) {
  const isFrozen = vehicle.cardStatus === "Frozen";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      className={`w-full text-left rounded-2xl p-4 border transition-colors cursor-pointer ${
        isFrozen
          ? "bg-zinc-900/80 border-zinc-700 text-zinc-300"
          : "bg-gradient-to-br from-sky-600 to-sky-800 text-white border-sky-500/40 hover:border-sky-400/60"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-lg font-bold tracking-tight">
            {vehicle.registrationNumber}
          </div>
          {vehicle.vic && (
            <div
              className={`text-sm font-mono ${
                isFrozen ? "text-zinc-500" : "text-sky-100"
              }`}
            >
              {vehicle.vic}
            </div>
          )}
        </div>
        {isFrozen ? (
          <Snowflake className="w-5 h-5 text-zinc-500 shrink-0" />
        ) : (
          <CreditCard className="w-5 h-5 text-sky-100 shrink-0" />
        )}
      </div>

      <div className={`text-sm mt-3 ${isFrozen ? "text-zinc-500" : "text-sky-100"}`}>
        {vehicle.make} {vehicle.model}
      </div>

      <div className="mt-4 pt-3 border-t border-current/20 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div
            className={`text-[12px] ${isFrozen ? "text-zinc-500" : "text-sky-200"}`}
          >
            Driver
          </div>
          <div className="text-sm font-semibold truncate max-w-[140px]">
            {vehicle.driverName ?? "Unassigned"}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div
            className={`text-[12px] ${isFrozen ? "text-zinc-500" : "text-sky-200"}`}
          >
            Balance
          </div>
          <div className="text-lg font-mono font-bold tabular-nums">
            E{vehicle.balanceSzl.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          aria-label={`Inspect ${vehicle.registrationNumber}`}
          className="min-h-10 px-3 rounded-xl text-sm font-semibold bg-black/20 hover:bg-black/30 touch-manipulation"
        >
          Inspect
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onQuickSend?.(vehicle.registrationNumber);
          }}
          aria-label={`Send money to ${vehicle.registrationNumber}`}
          disabled={isFrozen}
          className={`min-h-10 px-4 rounded-xl text-sm font-bold touch-manipulation ${
            isFrozen
              ? "opacity-40 cursor-not-allowed bg-zinc-800 text-zinc-400"
              : "bg-amber-500 text-black hover:bg-amber-400"
          }`}
        >
          Send
        </button>
      </div>

      {vehicle.cardNumber && (
        <div
          className={`mt-2 text-[12px] font-mono truncate ${
            isFrozen ? "text-zinc-500" : "text-sky-200"
          }`}
        >
          {vehicle.cardNumber}
        </div>
      )}
    </div>
  );
}
