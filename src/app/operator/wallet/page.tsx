/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import PaymentHistoryList from "@/components/payments/PaymentHistoryList";
import TopUpModal from "@/components/payments/TopUpModal";

export default function OperatorWalletPage() {
  const { user } = useAuth();
  const [showTopUp, setShowTopUp] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
            Wallet & Payments
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Top up your master card via mobile money, and view your payment history.
          </p>
        </div>
        <button
          onClick={() => setShowTopUp(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Top Up Master Card
        </button>
      </header>

      <div key={refreshKey}>
        <PaymentHistoryList />
      </div>

      {showTopUp && user.operatorId && (
        <TopUpModal
          purpose="master_card_topup"
          targetEntityId={user.operatorId}
          targetLabel={`${user.fullName}'s Master Card`}
          defaultPhone={user.phone ?? ""}
          onClose={() => setShowTopUp(false)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
