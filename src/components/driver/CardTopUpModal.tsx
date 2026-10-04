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
        <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl max-w-md w-full p-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="text-sm font-black uppercase text-white">
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
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-black uppercase text-white">
              Top Up Vehicle Card
            </h3>
            <p className="text-[11px] text-zinc-500 font-mono">{vehicleReg}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl p-3 text-xs flex items-start gap-2">
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
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-lg font-black font-mono text-white"
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
                      : "bg-white/[0.06] text-zinc-300"
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
                  : "border-white/[0.06]"
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
                  ? "border-blue-400 bg-blue-50 dark:bg-blue-950/40"
                  : "border-white/[0.06]"
              }`}>
                <input
                  type="radio"
                  checked={providerId === "momo"}
                  onChange={() => setProviderId("momo")}
                  className="text-blue-600"
                />
                <Smartphone className="w-4 h-4 text-zinc-500" />
                <span className="font-bold">Mobile Money (Coming Soon)</span>
              </label>
            </div>
          </div>

          {providerId === "momo" && (
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+268 ..."
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || amount < 10}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-black uppercase tracking-wide disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>Top Up E{amount.toFixed(2)}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
