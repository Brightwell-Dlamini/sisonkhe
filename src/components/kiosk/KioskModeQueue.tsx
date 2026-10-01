/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Per-route vehicle queue sequence.
 */

"use client";

import { useMemo } from "react";
import { ListOrdered } from "lucide-react";
import type { KioskSnapshot, PublicVehicle } from "@/lib/public/kiosk";

interface Props {
  snapshot: KioskSnapshot;
}

export default function KioskModeQueue({ snapshot }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<string, PublicVehicle[]>();
    for (const v of snapshot.vehicles) {
      if (!v.routeId) continue;
      const existing = map.get(v.routeId) ?? [];
      existing.push(v);
      map.set(v.routeId, existing);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const aPos = a.currentQueuePosition > 0 ? a.currentQueuePosition : 999;
        const bPos = b.currentQueuePosition > 0 ? b.currentQueuePosition : 999;
        return aPos - bPos;
      });
    }
    return map;
  }, [snapshot.vehicles]);

  if (snapshot.routes.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
        <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
          No routes configured.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {snapshot.routes.map((route) => {
        const vehicles = grouped.get(route.id) ?? [];
        if (vehicles.length === 0) return null;

        return (
          <div
            key={route.id}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase font-space">
                  {route.origin} → {route.destination}
                </h3>
              </div>
              <span className="text-xs font-mono text-zinc-500">
                {vehicles.length} in queue
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {vehicles.map((v, idx) => (
                <div
                  key={v.registrationNumber}
                  className={`p-3 rounded-xl border font-mono text-xs space-y-1.5 ${
                    idx === 0
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100"
                      : idx === 1
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded font-black text-[10px] ${
                        idx === 0
                          ? "bg-emerald-600 text-white"
                          : idx === 1
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
                      }`}
                    >
                      #{v.currentQueuePosition > 0 ? v.currentQueuePosition : "—"}
                    </span>
                    <span className="text-[10px] font-bold uppercase">
                      {v.loadingBay ?? "—"}
                    </span>
                  </div>
                  <div>
                    <strong className="text-sm block">
                      {v.registrationNumber}
                    </strong>
                    {v.driverDisplayName && (
                      <span className="text-[10px] opacity-75 font-sans">
                        {v.driverDisplayName}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-current/10 text-[10px]">
                    <span>{v.status}</span>
                    <span>{v.vic ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
