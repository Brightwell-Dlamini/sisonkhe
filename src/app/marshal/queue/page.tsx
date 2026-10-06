/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import RosterView from "@/components/marshal/RosterView";

export default function MarshalQueuePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black text-white uppercase tracking-wide">
          30-Day Queue
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Rotation roster for your terminal routes
        </p>
      </div>
      <RosterView />
    </div>
  );
}
