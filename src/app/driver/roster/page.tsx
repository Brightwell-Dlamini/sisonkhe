/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import DriverRosterView from "@/components/driver/DriverRosterView";

export default function DriverRosterPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black text-white uppercase tracking-wide">
          My Roster
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          30-day rotation and queue position for your assigned route
        </p>
      </div>
      <DriverRosterView />
    </div>
  );
}
