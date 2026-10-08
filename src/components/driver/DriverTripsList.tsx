/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { Clock, Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui";
import type { DriverTrip } from "@/lib/driver/queries";

interface Props {
  trips: DriverTrip[];
}

export default function DriverTripsList({ trips }: Props) {
  return (
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          Recent Trips
        </h3>
        <span className="text-[10px] text-zinc-500 font-mono">
          {trips.length} records
        </span>
      </div>

      {trips.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No trips yet"
          description="Trips appear here after your marshal dispatches your vehicle."
        />
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {trips.map((t) => (
            <div key={t.id} className="px-5 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0 font-mono text-[10px] font-black text-zinc-500">
                {t.date.slice(-2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white">
                  {t.routeOrigin} → {t.routeDestination}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {t.date} · {t.departureTime}
                  {t.arrivalTime ? ` → ${t.arrivalTime}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-black font-mono text-white">
                  {t.passengerCount} pax
                </div>
                <div className="text-[10px] font-bold text-emerald-400 font-mono">
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
