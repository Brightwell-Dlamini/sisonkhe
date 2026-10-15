/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { Clock, Inbox } from "lucide-react";
import { EmptyState, StatusDot } from "@/components/ui";
import type { DriverTrip } from "@/lib/driver/queries";

interface Props {
  trips: DriverTrip[];
}

export default function DriverTripsList({ trips }: Props) {
  return (
    <div className="surface-raised overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="text-title flex items-center gap-2 text-base">
          <Clock className="w-4 h-4 text-zinc-400" />
          Recent trips
        </h3>
        <span className="text-meta font-mono">{trips.length}</span>
      </div>

      {trips.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No trips yet"
          description="Trips appear here after your marshal dispatches your vehicle."
          className="border-0 rounded-none"
        />
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {trips.map((t) => (
            <div key={t.id} className="px-4 sm:px-5 py-3.5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0 font-mono text-sm font-bold text-zinc-400">
                {t.date.slice(-2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {t.routeOrigin} → {t.routeDestination}
                </div>
                <div className="text-meta font-mono mt-0.5">
                  {t.date} · {t.departureTime}
                  {t.arrivalTime ? ` → ${t.arrivalTime}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold font-mono text-white tabular-nums">
                  {t.passengerCount} pax
                </div>
                <StatusDot tone="ok" label={`E ${t.revenueSzl.toFixed(0)}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
