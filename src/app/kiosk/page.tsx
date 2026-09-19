/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Standalone public kiosk page. No login required.
 *
 * Wraps the existing PublicDisplayScreen but drives it with real Supabase
 * data instead of localStorage mock data.
 */

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useKioskData } from "@/hooks/useKioskData";
import PublicDisplayScreen from "@/components/PublicDisplayScreen";

function KioskInner() {
  const searchParams = useSearchParams();
  const initialRegion = searchParams.get("region") ?? "Hhohho";

  const { snapshot, loading, error, setRegion } = useKioskData(initialRegion);

  const [regionConfigs, setRegionConfigs] = useState<any[]>([]);

  // Adapt our PublicRegionConfig to the RegionConfig shape the existing UI expects
  useEffect(() => {
    if (!snapshot?.regions) return;
    // Fetch all region configs for the switcher
    // (kiosk snapshot only includes the active one; the switcher needs all)
    // We'll fake them from the snapshot for now, and fetch the rest lazily
    const configs = snapshot.regions.map((code) => ({
      region: code,
      terminalName:
        code === snapshot.region && snapshot.regionConfig
          ? snapshot.regionConfig.terminalName
          : `${code} Terminal`,
      emergencyNumber:
        code === snapshot.region && snapshot.regionConfig
          ? snapshot.regionConfig.emergencyNumber ?? ""
          : "",
      announcement:
        code === snapshot.region && snapshot.regionConfig
          ? snapshot.regionConfig.announcement ?? ""
          : "",
    }));
    setRegionConfigs(configs);
  }, [snapshot]);

  if (loading && !snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-3" />
          <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
            Loading terminal data…
          </div>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="text-sm font-bold text-red-600 mb-2">
            Terminal data unavailable
          </div>
          <div className="text-xs text-zinc-500">
            {error ?? "Please contact the terminal operator."}
          </div>
        </div>
      </div>
    );
  }

  // Adapt PublicVehicle → Vehicle shape for the existing UI
  const vehiclesForUI = snapshot.vehicles.map((v) => ({
    registrationNumber: v.registrationNumber,
    fleetNumber: v.vic ?? v.registrationNumber,
    vic: v.vic ?? undefined,
    make: v.make,
    model: v.model,
    seatingCapacity: v.seatingCapacity,
    classification: v.classification as "kombi" | "midbus" | "bus",
    routeAssignmentId: v.routeId ?? "",
    loadingBay: v.loadingBay ?? "Bay 01",
    ownerName: "",
    ownerPhone: "",
    driverId: "",
    status: v.status as any,
    currentQueuePosition: v.currentQueuePosition,
    tripsToday: 0,
    lastActive: snapshot.serverTime,
  }));

  const routesForUI = snapshot.routes.map((r) => ({
    id: r.id,
    region: r.region as any,
    origin: r.origin,
    destination: r.destination,
    distanceKm: r.distanceKm,
    baseFareE: r.baseFareE,
    isPopular: r.isPopular,
    startTime: r.startTime ?? undefined,
  }));

  return (
    <PublicDisplayScreen
      vehicles={vehiclesForUI}
      routes={routesForUI}
      activeRegion={snapshot.region as any}
      regionConfigs={regionConfigs}
      drivers={[]}
      trips={[]}
      onNavigateTab={() => {}}
    />
  );
}

export default function KioskPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      }
    >
      <KioskInner />
    </Suspense>
  );
}
