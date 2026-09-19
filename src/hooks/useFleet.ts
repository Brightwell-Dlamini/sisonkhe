/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Typed hooks for consuming the fleet store. Components import from here,
 * never from the store directly. This keeps selector logic in one place.
 */

"use client";

import { useMemo } from "react";
import { useFleetStore, selectVehiclesByRegion, selectQueueForRoute, selectAdvertsForRegion } from "../store/useFleetStore";
import type { EswatiniRegion, Vehicle, Route, Driver, Advert } from "../types";

// --- Vehicles -------------------------------------------------------------

export function useVehicles(): Vehicle[] {
  return useFleetStore((s) => s.vehicles);
}

export function useVehiclesByRegion(region: EswatiniRegion): Vehicle[] {
  return useFleetStore(useMemo(() => selectVehiclesByRegion(region), [region]));
}

export function useVehicle(reg: string): Vehicle | undefined {
  return useFleetStore((s) => s.vehicles.find((v) => v.registrationNumber === reg));
}

export function useQueue(routeId: string): Vehicle[] {
  return useFleetStore(useMemo(() => selectQueueForRoute(routeId), [routeId]));
}

// --- Drivers --------------------------------------------------------------

export function useDrivers(): Driver[] {
  return useFleetStore((s) => s.drivers);
}

export function useDriver(id: string): Driver | undefined {
  return useFleetStore((s) => s.drivers.find((d) => d.id === id));
}

export function useDriverByVehicle(reg: string): Driver | undefined {
  return useFleetStore((s) => {
    const vehicle = s.vehicles.find((v) => v.registrationNumber === reg);
    if (!vehicle?.driverId) return undefined;
    return s.drivers.find((d) => d.id === vehicle.driverId);
  });
}

// --- Routes ---------------------------------------------------------------

export function useRoutes(): Route[] {
  return useFleetStore((s) => s.routes);
}

export function useRoutesByRegion(region: EswatiniRegion): Route[] {
  return useFleetStore((s) => s.routes.filter((r) => r.region === region));
}

export function useRoute(id: string): Route | undefined {
  return useFleetStore((s) => s.routes.find((r) => r.id === id));
}

// --- Config ---------------------------------------------------------------

export function useActiveRegion(): EswatiniRegion {
  return useFleetStore((s) => s.activeRegion);
}

export function useRankFee(): {
  fee: number;
  operational: number;
  nrtc: number;
  maintenance: number;
} {
  return useFleetStore((s) => ({
    fee: s.rankFee,
    operational: s.splitOperational,
    nrtc: s.splitNRTC,
    maintenance: s.splitMaintenance,
  }));
}

export function useIsDarkMode(): boolean {
  return useFleetStore((s) => s.isDarkMode);
}

// --- Adverts --------------------------------------------------------------

export function useAdvertsForRegion(region: EswatiniRegion): Advert[] {
  return useFleetStore(useMemo(() => selectAdvertsForRegion(region), [region]));
}

// --- Meta -----------------------------------------------------------------

export function useHydrated(): boolean {
  return useFleetStore((s) => s.hydrated);
}
