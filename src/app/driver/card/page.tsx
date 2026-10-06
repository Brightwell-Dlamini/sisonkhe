/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import DriverCardView from "@/components/driver/DriverCardView";

export default function DriverCardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black text-white uppercase tracking-wide">
          Virtual Card
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Vehicle card balance, top-ups, and statement
        </p>
      </div>
      <DriverCardView />
    </div>
  );
}
