/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import type { TripRow } from "@/lib/ledger/queries";

interface Props {
  trips: TripRow[];
}

const STATUS_COLORS: Record<string, string> = {
  Completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  InProgress:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  Cancelled: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
};

export default function TripsTable({ trips }: Props) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-[10px] font-black uppercase tracking-wider text-zinc-400">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Dep</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3 text-right">Pax</th>
              <th className="px-4 py-3 text-right">Revenue</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr
                key={t.id}
                className="border-b border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-950/50"
              >
                <td className="px-4 py-3 font-mono text-zinc-700 dark:text-zinc-300">
                  {t.date}
                </td>
                <td className="px-4 py-3 font-mono text-zinc-700 dark:text-zinc-300">
                  {t.departureTime}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  <div className="font-bold">
                    {t.routeOrigin} → {t.routeDestination}
                  </div>
                  <div className="text-[10px] text-zinc-400">{t.region}</div>
                </td>
                <td className="px-4 py-3 font-mono font-bold text-zinc-900 dark:text-white">
                  {t.vehicleReg}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {t.driverName ?? "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                  {t.passengerCount}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  E {t.revenueSzl.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${STATUS_COLORS[t.status] ?? ""}`}
                  >
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
