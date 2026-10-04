/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Receipt, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui";
import TripsTab from "./TripsTab";
import SettlementTab from "./SettlementTab";

type Tab = "trips" | "settlement";

export default function LedgerPage() {
  const [tab, setTab] = useState<Tab>("trips");

  return (
    <div>
      <PageHeader
        title="Ledger & Settlement"
        description="Trip history, rank fee reconciliation, and CSV exports for NRTC reporting."
      />

      <div className="flex items-center gap-1.5 bg-[#0F0F10] border border-white/[0.06] p-1 rounded-2xl w-fit mb-4">
        <button
          onClick={() => setTab("trips")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            tab === "trips"
              ? "bg-white/[0.08] text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Receipt className="w-4 h-4" />
          Trips
        </button>
        <button
          onClick={() => setTab("settlement")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            tab === "settlement"
              ? "bg-white/[0.08] text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
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
