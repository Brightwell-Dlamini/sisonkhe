/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Receipt, Wallet } from "lucide-react";
import TripsTab from "./TripsTab";
import SettlementTab from "./SettlementTab";

type Tab = "trips" | "settlement";

export default function LedgerPage() {
  const [tab, setTab] = useState<Tab>("trips");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
          Ledger & Settlement
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Trip history, rank fee reconciliation, and CSV exports for NRTC reporting.
        </p>
      </header>

      <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-fit">
        <button
          onClick={() => setTab("trips")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            tab === "trips"
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <Receipt className="w-4 h-4" />
          Trips
        </button>
        <button
          onClick={() => setTab("settlement")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            tab === "settlement"
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <Wallet className="w-4 h-4" />
          Settlement
        </button>
      </div>

      {tab === "trips" ? <TripsTab /> : <SettlementTab />}
    </div>
  );
}
