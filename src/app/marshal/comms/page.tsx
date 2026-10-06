/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import DriverCommsPanel from "@/components/marshal/DriverCommsPanel";
import { useMarshalVehicles } from "@/hooks/useMarshalVehicles";

export default function MarshalCommsPage() {
  const { vehicles, loading } = useMarshalVehicles();

  const drivers = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; phone: string | null }
    >();
    for (const v of vehicles) {
      if (v.driverId && v.driverName) {
        map.set(v.driverId, {
          id: v.driverId,
          name: v.driverName,
          phone: v.driverPhone ?? null,
        });
      }
    }
    return Array.from(map.values());
  }, [vehicles]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black text-white uppercase tracking-wide">
          Driver Comms
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Message drivers on your assigned routes
        </p>
      </div>
      {loading && drivers.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        </div>
      ) : (
        <DriverCommsPanel drivers={drivers} />
      )}
    </div>
  );
}
