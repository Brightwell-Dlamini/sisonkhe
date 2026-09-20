/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useEffect, useState } from "react";
import VehiclesList from "@/components/vehicles/VehiclesList";
import type { Route, Driver } from "@/types";

export default function VehiclesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    // Fetch routes for the public endpoint (they're public anyway)
    fetch("/api/public/kiosk?region=Hhohho", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.routes) {
          setRoutes(data.routes.map((r: any) => ({
            id: r.id,
            region: r.region,
            origin: r.origin,
            destination: r.destination,
            distanceKm: r.distanceKm,
            baseFareE: r.baseFareE,
            isPopular: r.isPopular,
            startTime: r.startTime,
          })));
        }
      })
      .catch(() => {});

    // Fetch drivers for name lookup
    fetch("/api/drivers", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.drivers) {
          setDrivers(data.drivers.map((d: any) => ({
            id: d.id,
            fullName: d.fullName,
            phone: d.phone,
            nationalId: d.nationalId ?? "",
            licenseNumber: d.licenseNumber ?? "",
            licenseClass: d.licenseClass ?? "",
            status: d.status ?? "Active",
            emergencyContactName: d.emergencyContactName ?? "",
            emergencyContactPhone: d.emergencyContactPhone ?? "",
            assignedVehicleReg: d.assignedVehicleReg ?? "",
            avatarSeed: d.avatarSeed ?? "",
            profilePictureUrl: d.profilePictureUrl ?? undefined,
            pdpNumber: d.pdpNumber ?? undefined,
            pdpStatus: d.pdpStatus ?? undefined,
          })));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
          Vehicle Registry
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Register commercial vehicles, manage permits, fitness, and driver assignments.
        </p>
      </header>

      <VehiclesList routes={routes} drivers={drivers} />
    </div>
  );
}
