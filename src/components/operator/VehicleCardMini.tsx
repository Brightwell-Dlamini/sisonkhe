"use client";

import { CreditCard, Snowflake } from "lucide-react";
import type { VehicleCardSummary } from "@/lib/operator/queries";

interface Props {
  vehicle: VehicleCardSummary;
  onClick: () => void;
  onQuickSend?: (reg: string) => void;
}

export default function VehicleCardMini({ vehicle, onClick, onQuickSend }: Props) {
  const isFrozen = vehicle.cardStatus === "Frozen";

  return (
    <div
      onClick={() => onClick?.()}
      className={`w-full text-left rounded-2xl p-4 border transition-all ${
        isFrozen
          ? "bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800"
          : "bg-gradient-to-br from-blue-500 to-blue-700 text-white border-blue-600 hover:shadow-lg"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono font-black text-lg">
            {vehicle.registrationNumber}
          </div>
          {vehicle.vic && (
            <div className={`text-[10px] font-mono ${isFrozen ? "text-slate-500" : "text-blue-200"}`}>
              {vehicle.vic}
            </div>
          )}
        </div>
        {isFrozen ? (
          <Snowflake className="w-5 h-5 text-slate-400" />
        ) : (
          <CreditCard className="w-5 h-5 text-blue-200" />
        )}
      </div>

      <div className={`text-xs mt-3 ${isFrozen ? "text-slate-500" : "text-blue-100"}`}>
        {vehicle.make} {vehicle.model}
      </div>

      <div className="mt-4 pt-3 border-t border-current/20 flex items-end justify-between">
        <div>
          <div className={`text-[10px] uppercase ${isFrozen ? "text-slate-400" : "text-blue-200"}`}>
            Driver
          </div>
          <div className="text-xs font-bold truncate max-w-[120px]">
            {vehicle.driverName ?? "Unassigned"}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-[10px] uppercase ${isFrozen ? "text-slate-400" : "text-blue-200"}`}>
            Balance
          </div>
          <div className={`text-base font-mono font-black ${isFrozen ? "text-slate-600 dark:text-slate-300" : ""}`}>
            E{vehicle.balanceSzl.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          aria-label={`Inspect ${vehicle.registrationNumber}`}
          className="text-xs text-zinc-400 bg-white/[0.02] px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          Inspect
        </button>
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickSend?.(vehicle.registrationNumber);
            }}
            aria-label={`Send money to ${vehicle.registrationNumber}`}
            disabled={isFrozen}
            className={`px-3 py-1 rounded-lg text-xs font-bold ${isFrozen ? "opacity-50 cursor-not-allowed" : "bg-amber-500 text-black"} focus:outline-none focus:ring-2 focus:ring-amber-400`}
          >
            Send
          </button>
        </div>
      </div>

      {vehicle.cardNumber && (
        <div className={`mt-2 text-[10px] font-mono truncate ${isFrozen ? "text-slate-400" : "text-blue-200"}`}>
          {vehicle.cardNumber}
        </div>
      )}
    </div>
  );
}
