/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import FleetCardsGrid from "@/components/operator/FleetCardsGrid";

export default function OperatorFleetPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
          Fleet Vehicle Cards
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          View all vehicle transit cards in your fleet. Click a card to inspect its transactions.
        </p>
      </header>

      <FleetCardsGrid />
    </div>
  );
}
