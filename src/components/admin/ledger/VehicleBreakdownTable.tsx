/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import type { SettlementSummary } from "@/lib/ledger/queries";

interface Props {
  vehicles: SettlementSummary["byVehicle"];
}

export default function VehicleBreakdownTable({ vehicles }: Props) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
          By Vehicle
        </h3>
        <span className="text-[10px] text-zinc-400 font-mono">
          {vehicles.length} {vehicles.length === 1 ? "vehicle" : "vehicles"}
        </span>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-8 text-xs text-zinc-500">
          No vehicle activity in this range.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/50">
                <th className="px-4 py-2.5">Vehicle</th>
                <th className="px-4 py-2.5">VIC</th>
                <th className="px-4 py-2.5 text-right">Dispatches</th>
                <th className="px-4 py-2.5 text-right">Collected</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr
                  key={v.vehicleReg}
                  className="border-b border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-950/50"
                >
                  <td className="px-4 py-3 font-mono font-bold text-zinc-900 dark:text-white">
                    {v.vehicleReg}
                  </td>
                  <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400 text-[11px]">
                    {v.vic ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                    {v.dispatchCount}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    E {v.totalCollected.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
