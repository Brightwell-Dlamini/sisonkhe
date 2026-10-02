"use client";

import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, Smartphone, CreditCard } from "lucide-react";
import { useDriverCard } from "@/hooks/useDriverCard";

interface Props {
  vehicleReg: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESETS = [100, 250, 500, 1000];

export default function CardTopUpModal({ vehicleReg, onClose, onSuccess }: Props) {
  const { topUp } = useDriverCard();
  const [amount, setAmount] = useState(250);
  const [providerId, setProviderId] = useState("manual");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await topUp(amount, providerId, phone || undefined);
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? "Top-up failed");
      return;
    }
    setSuccess(true);
    setTimeout(onSuccess, 2000);
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="text-sm font-black uppercase text-zinc-900 dark:text-white">
            Top-Up Successful
          </div>
          <div className="text-xs text-zinc-500">
            E{amount.toFixed(2)} added to {vehicleReg}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white">
              Top Up Vehicle Card
            </h3>
            <p className="text-[11px] text-zinc-500 font-mono">{vehicleReg}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-3 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-2">
              Amount (SZL)
            </label>
            <input
              type="number"
              min={10}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-lg font-black font-mono text-zinc-900 dark:text-white"
            />
            <div className="flex gap-1.5 mt-2">
              {PRESETS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(a)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    amount === a
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  E{a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-2">
              Payment Method
            </label>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-xs ${
                providerId === "manual"
                  ? "border-blue-400 bg-blue-50 dark:bg-blue-950/40"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}>
                <input
                  type="radio"
                  checked={providerId === "manual"}
                  onChange={() => setProviderId("manual")}
                  className="text-blue-600"
                />
                <CreditCard className="w-4 h-4 text-zinc-500" />
                <span className="font-bold">Ledger Top-Up (Instant)</span>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-xs opacity-60 ${
                providerId === "momo"
                  ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}>
                <input
                  type="radio"
                  checked={providerId === "momo"}
                  onChange={() => setProviderId("momo")}
                  className="text-amber-600"
                />
                <Smartphone className="w-4 h-4 text-zinc-500" />
                <span className="font-bold">MTN MoMo</span>
                <span className="text-[9px] text-zinc-400 ml-auto">Coming soon</span>
              </label>
            </div>
          </div>

          {providerId === "momo" && (
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-2">
                MoMo Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+268 7600 0000"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-white"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || amount <= 0}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Top Up E{amount.toFixed(2)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
