/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import VehiclesList from "@/components/vehicles/VehiclesList";

export default function VehiclesPage() {
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

      <VehiclesList />
    </div>
  );
}
