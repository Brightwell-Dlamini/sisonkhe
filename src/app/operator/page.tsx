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
        hasMasterCard={!!card}
        vehicleCount={vehicles.length}
        onTopUp={() => setShowTopUp(true)}
        onOpenFleet={() => router.push("/operator/fleet")}
        onOpenRenewals={() => router.push("/operator/renewals")}
      />

      <OperatorReadinessCard />

      {cardLoading && !card ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        </div>
      ) : card ? (
        <MasterCardView
          card={card}
          onTopUp={() => setShowTopUp(true)}
          onToggleFreeze={async () => {
            const res = await toggleFreeze();
            if (!res.success) toast.error(res.error || "Could not update card");
            else toast.success(card.status === "Frozen" ? "Card unfrozen" : "Card frozen");
          }}
        />
      ) : (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0F0F10] p-5 text-sm text-zinc-400">
          No master card yet. Create one from the operator wallet tools when ready.
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Fleet cards</h2>
          <Link
            href="/operator/fleet"
            className="text-xs font-semibold text-emerald-400 inline-flex items-center gap-1"
          >
            Open fleet <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <FleetCardsGrid vehicles={vehicles.slice(0, 6)} />
      </section>

      {showTopUp && user?.operatorId && (
        <TopUpModal
          open={showTopUp}
          onClose={() => setShowTopUp(false)}
          purpose="operator_master"
          entityId={user.operatorId}
          onSuccess={() => {
            setShowTopUp(false);
            void refresh();
            toast.success("Top-up submitted");
          }}
        />
      )}
    </div>
  );
}
