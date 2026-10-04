"use client";

import { useState } from "react";
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Send,
} from "lucide-react";
import type { VehicleCardSummary } from "@/lib/operator/queries";

interface Props {
  vehicles: VehicleCardSummary[];
  masterBalance: number;
  onClose: () => void;
  onSubmit: (input: {
    vehicleReg: string;
    amountSzl: number;
    category: string;
    description?: string;
  }) => Promise<{
    success: boolean;
    error?: string;
    newMasterBalance?: number;
    masterReceiptRef?: string;
  }>;
}

const CATEGORIES = [
  "Fuel Allowance",
  "Daily Rank Fee Budget",
  "Maintenance",
  "Emergency Driver Cash",
  "Permit Renewal",
  "Other",
];

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500];

export default function SendMoneyModal({
  vehicles,
  masterBalance,
  onClose,
  onSubmit,
}: Props) {
  const [vehicleReg, setVehicleReg] = useState(vehicles[0]?.registrationNumber ?? "");
  const [amount, setAmount] = useState(250);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ receipt: string } | null>(null);

  const selectedVehicle = vehicles.find((v) => v.registrationNumber === vehicleReg);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await onSubmit({
      vehicleReg,
      amountSzl: amount,
      category,
      description: note || undefined,
    });
    setLoading(false);

    if (!res.success) {
      setError(res.error ?? "Transfer failed");
      return;
    }

    setSuccess({ receipt: res.masterReceiptRef ?? "\u2014" });
    setTimeout(onClose, 2000);
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl max-w-md w-full p-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="text-sm font-black uppercase text-white">
            Transfer Sent
          </div>
          <div className="text-xs text-zinc-500">
            E{amount.toFixed(2)} \u2192 {vehicleReg}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">
            Receipt: {success.receipt}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-black uppercase text-white">
              Send Money to Vehicle
            </h3>
            <p className="text-[11px] text-zinc-500">
              Master balance: E{masterBalance.toFixed(2)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Vehicle
            </label>
            {vehicles.length === 0 ? (
              <div className="text-xs text-zinc-500 italic">
                No vehicles registered to your account.
              </div>
            ) : (
              <select
                value={vehicleReg}
                onChange={(e) => setVehicleReg(e.target.value)}
                className="w-full bg-[#0F0F10] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm font-bold text-white"
              >
                {vehicles.map((v) => (
                  <option key={v.registrationNumber} value={v.registrationNumber}>
                    {v.registrationNumber} {v.vic ? `(${v.vic})` : ""} \u2014 E
                    {v.balanceSzl.toFixed(2)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedVehicle && (
            <div className="p-3 rounded-xl bg-[#0F0F10] border border-white/[0.06] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Driver:</span>
                <span className="font-bold text-white">
                  {selectedVehicle.driverName ?? "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Current balance:</span>
                <span className="font-mono text-emerald-600 font-bold">
                  E{selectedVehicle.balanceSzl.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Amount (SZL)
            </label>
            <input
              type="number"
              min={1}
              max={masterBalance}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="w-full bg-[#0F0F10] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-lg font-black font-mono text-white"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESET_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(a)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    amount === a
                      ? "bg-amber-500 text-black"
                      : "bg-white/[0.06] text-zinc-300"
                  }`}
                >
                  E{a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Purpose / Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#0F0F10] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Weekly fuel float"
              className="w-full bg-[#0F0F10] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white/[0.06] text-zinc-300 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || amount <= 0 || amount > masterBalance || !vehicleReg}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Send E{amount.toFixed(2)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
