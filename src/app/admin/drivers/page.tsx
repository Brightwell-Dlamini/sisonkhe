/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import DriversList from "@/components/drivers/DriversList";

export default function DriversPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
          Driver Management
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Register drivers, assign vehicles, and manage licenses & PDP credentials.
        </p>
      </header>

      <DriversList />
    </div>
  );
}
