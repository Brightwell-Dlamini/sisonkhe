"use client";

import { useState } from "react";
import {
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
} from "lucide-react";
import { useOperatorMasterCard } from "@/hooks/useOperatorMasterCard";
import { useOperatorFleetCards } from "@/hooks/useOperatorFleetCards";
import MasterCardView from "@/components/operator/MasterCardView";
import MasterCardActions from "@/components/operator/MasterCardActions";
import SendMoneyModal from "@/components/operator/SendMoneyModal";
import TopUpModal from "@/components/payments/TopUpModal";
import { useAuth } from "@/hooks/useAuth";

export default function OperatorWalletPage() {
  const { user } = useAuth();
  const { card, transactions, loading, error, refresh, toggleFreeze, sendMoney } =
    useOperatorMasterCard();
  const { vehicles } = useOperatorFleetCards();

  const [showSend, setShowSend] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  if (loading && !card) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-xs">
        {error ?? "No master card"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
          Master Wallet
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Manage your Operator Master Card and disburse funds to your fleet.
        </p>
      </header>

      {toast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl px-4 py-3 text-xs font-bold">
          {toast}
        </div>
      )}

      <MasterCardView card={card} />

      <MasterCardActions
        status={card.status}
        onReload={() => setShowTopUp(true)}
        onSend={() => setShowSend(true)}
        onToggleFreeze={async () => {
          const ok = await toggleFreeze();
          if (ok) showToast(`Card ${card.status === "Active" ? "frozen" : "unfrozen"}`);
          return ok;
        }}
      />

      {/* Transactions */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
            Master Card Transactions
          </h3>
          <span className="text-[10px] text-zinc-400 font-mono">
            {transactions.length} records
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            No transactions yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-96 overflow-y-auto">
            {transactions.map((tx) => {
              const isCredit = tx.direction === "CREDIT";
              return (
                <div key={tx.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isCredit
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600"
                          : "bg-blue-100 dark:bg-blue-950/60 text-blue-600"
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {tx.description}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-2">
                        <span>
                          {new Date(tx.timestamp).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {tx.targetVehicleReg && (
                          <span className="text-zinc-400">
                            → {tx.targetVehicleReg}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`font-mono font-bold text-sm shrink-0 ${
                      isCredit ? "text-emerald-600" : "text-zinc-900 dark:text-white"
                    }`}
                  >
                    {isCredit ? "+" : "−"}E{tx.amountSzl.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSend && (
        <SendMoneyModal
          vehicles={vehicles}
          masterBalance={card.balanceSzl}
          onClose={() => setShowSend(false)}
          onSubmit={async (input) => {
            const res = await sendMoney(input);
            if (res.success) showToast(`E${input.amountSzl.toFixed(2)} sent to ${input.vehicleReg}`);
            return res;
          }}
        />
      )}

      {showTopUp && user?.operatorId && (
        <TopUpModal
          purpose="master_card_topup"
          targetEntityId={user.operatorId}
          targetLabel={`${user.fullName}'s Master Card`}
          defaultPhone={user.phone ?? ""}
          onClose={() => setShowTopUp(false)}
          onSuccess={() => {
            refresh();
            showToast("Top-up successful");
          }}
        />
      )}
    </div>
  );
}
