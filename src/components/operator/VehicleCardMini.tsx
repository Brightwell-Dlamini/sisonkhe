"use client";

import { CreditCard, Snowflake } from "lucide-react";
import type { VehicleCardSummary } from "@/lib/operator/queries";

interface Props {
  vehicle: VehicleCardSummary;
  onClick: () => void;
}

export default function VehicleCardMini({ vehicle, onClick }: Props) {
  const isFrozen = vehicle.cardStatus === "Frozen";

  return (
    <button
      onClick={onClick}
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

      {vehicle.cardNumber && (
        <div className={`mt-2 text-[10px] font-mono truncate ${isFrozen ? "text-slate-400" : "text-blue-200"}`}>
          {vehicle.cardNumber}
        </div>
      )}
    </button>
  );
}
