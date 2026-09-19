/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import StaffList from "@/components/staff/StaffList";

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
          Staff Management
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Create and manage administrators, fleet managers, and inspectors.
        </p>
      </header>

      <StaffList />
    </div>
  );
}
