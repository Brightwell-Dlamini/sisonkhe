/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Standalone public kiosk page. No login required.
 */

"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useKioskData } from "@/hooks/useKioskData";
import PublicDisplayScreen from "@/components/PublicDisplayScreen";

const ALL_REGIONS = ["Hhohho", "Manzini", "Lubombo", "Shiselweni"] as const;

function KioskInner() {
  const searchParams = useSearchParams();
  const initialRegion = searchParams.get("region") ?? "Hhohho";

  const { snapshot, loading, error, setRegion } = useKioskData(initialRegion);

  // Build regionConfigs synchronously so PublicDisplayScreen never sees []
  const regionConfigs = useMemo(() => {
    const codes =
      snapshot?.regions && snapshot.regions.length > 0
        ? snapshot.regions
        : [...ALL_REGIONS];

    return codes.map((code) => {
      const isActive =
        snapshot &&
        code === snapshot.region &&
        snapshot.regionConfig != null;
      return {
        region: code,
        terminalName: isActive
          ? snapshot!.regionConfig!.terminalName || `${code} Terminal`
          : `${code} Terminal`,
        emergencyNumber: isActive
          ? snapshot!.regionConfig!.emergencyNumber ?? ""
          : "",
        announcement: isActive
          ? snapshot!.regionConfig!.announcement ?? ""
          : "",
      };
    });
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
      regionConfigs={regionConfigs as any}
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
