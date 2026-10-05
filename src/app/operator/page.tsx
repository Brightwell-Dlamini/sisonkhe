/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Operator home — overview of master card and fleet, with links.
 */

"use client";

import Link from "next/link";
import {
  CreditCard,
  Truck,
  FileText,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useOperatorMasterCard } from "@/hooks/useOperatorMasterCard";
import { useOperatorFleetCards } from "@/hooks/useOperatorFleetCards";
import MasterCardView from "@/components/operator/MasterCardView";
import FleetCardsGrid from "@/components/operator/FleetCardsGrid";

export default function OperatorHome() {
  const { card, loading: cardLoading, refresh: refreshCard } =
    useOperatorMasterCard();
  const { cards: fleetCards, loading: fleetLoading } = useOperatorFleetCards();

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">
            Operator Desk
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Master card, fleet vehicles, and permit renewals.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/operator/wallet"
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Wallet
          </Link>
          <Link
            href="/operator/fleet"
            className="px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-zinc-200 text-xs font-bold flex items-center gap-1.5"
          >
            <Truck className="w-3.5 h-3.5" />
            Fleet
          </Link>
          <Link
            href="/operator/renewals"
            className="px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-zinc-200 text-xs font-bold flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            Renewals
          </Link>
        </div>
      </header>

      {/* Master card */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-white">
            Master Card
          </h2>
          <Link
            href="/operator/wallet"
            className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
          >
            Manage <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {cardLoading && !card ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
          </div>
        ) : (
          <MasterCardView card={card} onRefresh={refreshCard} />
        )}
      </section>

      {/* Fleet snapshot */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-white">
            Fleet vehicles
          </h2>
          <Link
            href="/operator/fleet"
            className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
          >
            Full fleet <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {fleetLoading && fleetCards.length === 0 ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
          </div>
        ) : (
          <FleetCardsGrid cards={fleetCards.slice(0, 6)} />
        )}
      </section>
    </div>
  );
}
