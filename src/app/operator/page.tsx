/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Operator home — overview of master card and fleet, with links.
 */

"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  CreditCardIcon,
  Truck,
  FileText,
  ArrowRight,
  Loader2,
  WalletCards,
} from "lucide-react";
import { useOperatorMasterCard } from "@/hooks/useOperatorMasterCard";
import { useOperatorFleetCards } from "@/hooks/useOperatorFleetCards";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui";
import TopUpModal from "@/components/payments/TopUpModal";
import MasterCardView from "@/components/operator/MasterCardView";
import FleetCardsGrid from "@/components/operator/FleetCardsGrid";
import OperatorReadinessCard from "@/components/operator/OperatorReadinessCard";
import { RoleGuidance } from "@/components/common/RoleGuidance";
import { RoleWelcomeBanner } from "@/components/common/RoleWelcomeBanner";

export default function OperatorHome() {
  const { card, loading: cardLoading, toggleFreeze, refresh } = useOperatorMasterCard();
  const { vehicles } = useOperatorFleetCards();
  const { user } = useAuth();
  const toast = useToast();
  const [showTopUp, setShowTopUp] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-6">
      <RoleWelcomeBanner
        title="Operator desk ready"
        subtitle="Review your master card, fleet coverage, and renewal queue before the next operating cycle begins."
        actionLabel="Review renewals"
        actionHref="/operator/renewals"
      />

      {card && (
        <OperatorReadinessCard
          balanceSzl={card.balanceSzl}
          fleetCount={vehicles.length}
          status={card.status}
          onReload={() => setShowTopUp(true)}
          onSend={() => router.push("/operator/wallet")}
          onToggleFreeze={async () => {
            const ok = await toggleFreeze();
            if (ok) {
              await refresh();
              toast.success(
                card.status === "Frozen" ? "Master card reactivated" : "Master card frozen",
                card.status === "Frozen" ? "Fleet operations can continue." : "Transfers and renewals are now paused."
              );
            } else {
              toast.error("Freeze update failed", "Please try again in a moment.");
            }
            return ok;
          }}
        />
      )}

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
        ) : card ? (
          <MasterCardView card={card} />
        ) : (
          <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-8 text-center text-xs text-zinc-500">
            No master card on file. Contact administration.
          </div>
        )}
      </section>

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
        <FleetCardsGrid />
      </section>

      <RoleGuidance
        title="Operator flow"
        items={[
          {
            label: "Review master card",
            detail: "Check the business profile, balance, and handoff status for the current fleet cycle.",
            href: "/operator",
            icon: CreditCardIcon,
          },
          {
            label: "Manage wallet",
            detail: "Top up or review the account used for transport and settlement movements.",
            href: "/operator/wallet",
            icon: WalletCards,
          },
          {
            label: "Review fleet",
            detail: "Track every vehicle and keep your fleet coverage aligned with active demand.",
            href: "/operator/fleet",
            icon: Truck,
          },
          {
            label: "Submit renewals",
            detail: "Open any renewal or compliance request before expiry to keep operations moving.",
            href: "/operator/renewals",
            icon: FileText,
          },
        ]}
      />
      {showTopUp && user?.operatorId && (
        <TopUpModal
          purpose="master_card_topup"
          targetEntityId={user.operatorId}
          targetLabel={`${user.fullName}'s Master Card`}
          defaultPhone={user.phone ?? ""}
          onClose={() => setShowTopUp(false)}
          onSuccess={() => {
            void refresh();
            setShowTopUp(false);
          }}
        />
      )}
    </div>
  );
}
