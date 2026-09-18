/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { FleetOperator, OperatorMasterCard } from "../../types";
import { topUpOperatorMasterCard } from "../../utils/operatorCards";
import { X, ArrowUpRight, CheckCircle2, ShieldCheck, CreditCard, Building2, Smartphone, DollarSign, AlertCircle } from "lucide-react";

interface OperatorTopUpModalProps {
  operator: FleetOperator;
  masterCard: OperatorMasterCard;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function OperatorTopUpModal({
  operator,
  masterCard,
  onClose,
  onSuccess
}: OperatorTopUpModalProps) {
  const [amount, setAmount] = useState<number>(5000);
  const [paymentMethod, setPaymentMethod] = useState<string>("FNB Eswatini EFT Direct");
  const [reference, setReference] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const methods = [
    { id: "FNB Eswatini EFT Direct", name: "FNB Eswatini EFT Direct", icon: Building2, desc: "Instant corporate bank transfer" },
    { id: "MTN MoMo Business", name: "MTN MoMo Business PayBill", icon: Smartphone, desc: "PayBill: 400 200 &bull; Fast settlement" },
    { id: "Standard Bank Eswatini", name: "Standard Bank Business Online", icon: Building2, desc: "Direct commercial clearance" },
    { id: "Nedbank Eswatini", name: "Nedbank Eswatini Enterprise", icon: Building2, desc: "Real-time clearing account" },
    { id: "Cash Deposit at Terminal Rank", name: "Cash Deposit at Terminal Agency", icon: DollarSign, desc: "Receipt verified at Mbabane Plaza" }
  ];

  const presets = [1000, 2500, 5000, 10000, 20000];

  const handleTopUp = () => {
    setError("");
    if (amount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedRef = reference || `REF-${Math.floor(100000 + Math.random() * 900000)}`;
      const result = topUpOperatorMasterCard(
        operator.id,
        amount,
        paymentMethod,
        generatedRef
      );

      if (result.success) {
        onSuccess(`Master Card reloaded with E${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}! (Ref: ${result.receiptRef})`);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to complete top-up");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-5 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white font-space">
                Top Up Operator Master Card
              </h2>
              <p className="text-xs text-zinc-500">
                Deposit funds to disburse across your commercial vehicle fleet
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono flex-1">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Master Card status */}
          <div className="p-3.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">
                Operator Master Account
              </span>
              <strong className="text-xs text-zinc-900 dark:text-white font-mono block">
                {masterCard.cardNumber}
              </strong>
              <span className="text-[10px] text-zinc-500 font-sans">
                {operator.name} &bull; {operator.companyName}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">
                Current Balance
              </span>
              <span className="text-sm font-black text-zinc-900 dark:text-white font-mono">
                E {masterCard.balanceSZL.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-sans">
              1. Deposit Amount (SZL)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-zinc-400 text-sm">
                E
              </span>
              <input
                type="number"
                min="10"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded-xl font-mono text-base font-extrabold text-zinc-900 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  className={`px-3 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                    amount === p
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                      : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  E{p.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-sans">
              2. Funding Method
            </label>
            <div className="space-y-1.5">
              {methods.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all font-sans ${
                    paymentMethod === m.id
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-300"
                      : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <m.icon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-xs block">{m.name}</span>
                      <span className="text-[10px] text-zinc-400">{m.desc}</span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === m.id}
                    onChange={() => setPaymentMethod(m.id)}
                    className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* External Reference */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-500 font-sans">
              Bank Transaction / MoMo Reference (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. FNB-EFT-99214 or leave blank to auto-generate"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs"
            />
          </div>

          {/* Summary */}
          <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] flex justify-between items-center">
            <span className="text-zinc-600 dark:text-zinc-400 font-sans">
              New Master Balance After Deposit:
            </span>
            <span className="font-black text-emerald-700 dark:text-emerald-300 font-mono text-sm">
              E {(masterCard.balanceSZL + amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-zinc-150 dark:border-zinc-800 flex items-center justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-800/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleTopUp}
            disabled={isSubmitting || amount <= 0}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Confirming Deposit...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Deposit E{amount.toLocaleString()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
