/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Top-up modal. Lets the user pick a provider, enter an amount and phone
 * (if required), and initiates the payment.
 *
 * Handles three states:
 *   1. Form — pick provider + amount + phone
 *   2. Pending — show instructions, poll for confirmation
 *   3. Result — success / failure
 */

"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Smartphone,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import { usePaymentIntent } from "@/hooks/usePaymentIntent";
import type { ProviderId, PaymentPurpose } from "@/lib/payments/types";

interface Props {
  purpose: PaymentPurpose;
  targetEntityId: string;
  targetLabel: string; // "Cyril Kunene's Master Card" or "HSD 101 BM"
  defaultPhone?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

const PROVIDER_ICONS: Record<ProviderId, React.ElementType> = {
  momo: Smartphone,
  emlangeni: Smartphone,
  manual: CreditCard,
};

export default function TopUpModal({
  purpose,
  targetEntityId,
  targetLabel,
  defaultPhone,
  onClose,
  onSuccess,
}: Props) {
  const { intent, providers, live, loading, error, create, poll, cancel } =
    usePaymentIntent();

  const [providerId, setProviderId] = useState<ProviderId | "">("");
  const [amount, setAmount] = useState<number>(500);
  const [phone, setPhone] = useState(defaultPhone ?? "");

  // Auto-select first provider once loaded
  useEffect(() => {
    if (providers.length > 0 && !providerId) {
      setProviderId(providers[0].id);
    }
  }, [providers, providerId]);

  const selectedProvider = providers.find((p) => p.id === providerId);

  // Handle success
  useEffect(() => {
    if (intent?.status === "completed") {
      const t = setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [intent?.status, onSuccess, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerId) return;
    if (selectedProvider?.requiresPayerPhone && !phone.trim()) return;

    await create({
      providerId,
      amountSzl: amount,
      purpose,
      targetEntityId,
      payerPhone: phone || undefined,
      description: `Top-up for ${targetLabel}`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-zinc-900 dark:text-white">
              Top Up Wallet
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">{targetLabel}</p>
          </div>
          <button
            onClick={() => {
              cancel();
              onClose();
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* -------- Pending state -------- */}
        {intent && intent.status === "pending" && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-amber-600 dark:text-amber-400 animate-spin" />
              </div>
              <div>
                <div className="text-sm font-black uppercase text-zinc-900 dark:text-white">
                  Waiting for confirmation
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {intent.instructions ?? "Check your phone for a prompt."}
                </div>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500">Amount:</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  E {intent.amountSzl.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Reference:</span>
                <span className="text-zinc-700 dark:text-zinc-300 truncate ml-2">
                  {intent.providerReference}
                </span>
              </div>
            </div>

            <button
              onClick={() => void poll()}
              className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Check Status Now
            </button>
          </div>
        )}

        {/* -------- Completed state -------- */}
        {intent && intent.status === "completed" && (
          <div className="p-5 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-black uppercase text-emerald-700 dark:text-emerald-300">
                Payment Successful
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                E {intent.amountSzl.toFixed(2)} credited
              </div>
            </div>
          </div>
        )}

        {/* -------- Failed state -------- */}
        {intent &&
          ["failed", "cancelled", "expired"].includes(intent.status) && (
            <div className="p-5 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center mx-auto">
                <XCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-sm font-black uppercase text-red-700 dark:text-red-300">
                  Payment {intent.status}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {intent.failureReason ?? "The payment did not complete."}
                </div>
              </div>
              <button
                onClick={cancel}
                className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
              >
                Try Again
              </button>
            </div>
          )}

        {/* -------- Form state -------- */}
        {!intent && (
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-3 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!live && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-xl p-3 text-xs">
                <strong>Development mode:</strong> real payment providers are
                disabled. Top-ups will be credited instantly via the ledger
                provider.
              </div>
            )}

            {/* Provider picker */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-2">
                Payment Method
              </label>
              <div className="space-y-2">
                {providers.map((p) => {
                  const Icon = PROVIDER_ICONS[p.id] ?? CreditCard;
                  const isSelected = providerId === p.id;
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                        isSelected
                          ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                          : "border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name="provider"
                        checked={isSelected}
                        onChange={() => setProviderId(p.id)}
                        className="text-emerald-600"
                      />
                      <Icon
                        className={`w-4 h-4 ${isSelected ? "text-emerald-600" : "text-zinc-500"}`}
                      />
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {p.displayName}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-2">
                Amount (SZL)
              </label>
              <input
                type="number"
                min={10}
                max={50000}
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-lg font-black font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PRESET_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmount(a)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold ${
                      amount === a
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    E{a}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone (if required) */}
            {selectedProvider?.requiresPayerPhone && (
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-2">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+268 7600 0000"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  {selectedProvider.id === "momo"
                    ? "You'll receive a prompt on this number to approve the payment."
                    : "You'll receive a USSD prompt on this number."}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  cancel();
                  onClose();
                }}
                className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  loading ||
                  !providerId ||
                  amount <= 0 ||
                  (selectedProvider?.requiresPayerPhone && !phone.trim())
                }
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Initiate Payment
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
