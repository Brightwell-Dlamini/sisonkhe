/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Operator home — checklist first, then card and fleet.
 */

"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { useOperatorMasterCard } from "@/hooks/useOperatorMasterCard";
import { useOperatorFleetCards } from "@/hooks/useOperatorFleetCards";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui";
import TopUpModal from "@/components/payments/TopUpModal";
import MasterCardView from "@/components/operator/MasterCardView";
import FleetCardsGrid from "@/components/operator/FleetCardsGrid";
import OperatorReadinessCard from "@/components/operator/OperatorReadinessCard";
import OperatorOnboardingChecklist from "@/components/operator/OperatorOnboardingChecklist";
import FirstRunWizard from "@/components/common/FirstRunWizard";

export default function OperatorHome() {
  const { card, loading: cardLoading, toggleFreeze, refresh } =
    useOperatorMasterCard();
  const { vehicles } = useOperatorFleetCards();
  const { user } = useAuth();
  const toast = useToast();
  const [showTopUp, setShowTopUp] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-6">
      <FirstRunWizard
        role="operator"
        userId={user?.authUserId}
        displayName={user?.fullName}
      />

      <header>
        <h1 className="text-xl font-black text-white uppercase tracking-tight">
          Operator desk
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Master card, fleet, and renewals.
        </p>
      </header>

      <OperatorOnboardingChecklist
        hasCard={!!card}
        balanceSzl={card?.balanceSzl ?? 0}
        fleetCount={vehicles.length}
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
                card.status === "Frozen"
                  ? "Master card reactivated"
                  : "Master card frozen",
                card.status === "Frozen"
                  ? "Fleet operations can continue."
                  : "Transfers and renewals are now paused."
              );
            } else {
              toast.error("Freeze update failed", "Please try again in a moment.");
            }
            return ok;
          }}
        />
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-white">
            Master card
          </h2>
          <Link
            href="/operator/wallet"
            className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
          >
            Wallet <ArrowRight className="w-3 h-3" />
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
