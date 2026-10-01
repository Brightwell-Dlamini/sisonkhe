/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { Clock, Inbox } from "lucide-react";
import type { DriverTrip } from "@/lib/driver/queries";

interface Props {
  trips: DriverTrip[];
}

export default function DriverTripsList({ trips }: Props) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          Recent Trips
        </h3>
        <span className="text-[10px] text-zinc-400 font-mono">
          {trips.length} records
        </span>
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="w-7 h-7 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
          <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
            No trips yet
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Trips appear here after your marshal dispatches your vehicle.
          </div>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {trips.map((t) => (
            <div key={t.id} className="px-5 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 font-mono text-[10px] font-black text-zinc-500">
                {t.date.slice(-2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-zinc-900 dark:text-white">
                  {t.routeOrigin} → {t.routeDestination}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {t.date} • {t.departureTime}
                  {t.arrivalTime ? ` → ${t.arrivalTime}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-black font-mono text-zinc-900 dark:text-white">
                  {t.passengerCount} pax
                </div>
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  E {t.revenueSzl.toFixed(0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
