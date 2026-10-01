/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Loader2, FileWarning, X, AlertCircle } from "lucide-react";
import type { InspectorVehicleView } from "@/lib/inspector/queries";
import { OFFENCE_TYPES } from "@/lib/inspector/validation";

interface Props {
  vehicle: InspectorVehicleView;
  onCancel: () => void;
  onSubmit: (input: {
    vehicleReg: string;
    offenseType: string;
    amountSzl: number;
    location?: string;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const SUGGESTED_AMOUNTS: Record<string, number> = {
  Speeding: 350,
  Overloading: 500,
  "Expired Permit": 750,
  Unroadworthy: 500,
  "No Public Liability Cover": 400,
  "Illegal Picking/Dropping": 300,
  Other: 200,
};

export default function TicketForm({ vehicle, onCancel, onSubmit }: Props) {
  const [offenseType, setOffenseType] = useState(OFFENCE_TYPES[0]);
  const [amount, setAmount] = useState(SUGGESTED_AMOUNTS[OFFENCE_TYPES[0]] ?? 300);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-suggest amount when offense changes
  const handleOffenceChange = (o: string) => {
    setOffenseType(o as typeof OFFENCE_TYPES[number]);
    setAmount(SUGGESTED_AMOUNTS[o] ?? 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await onSubmit({
      vehicleReg: vehicle.registrationNumber,
      offenseType,
      amountSzl: amount,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setLoading(false);
    if (!result.success) setError(result.error ?? "Failed to create ticket");
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-red-300 dark:border-red-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-red-600" />
            Issue Traffic Ticket
          </h3>
          <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
            {vehicle.registrationNumber} • {vehicle.ownerName ?? "Owner unknown"}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
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
          <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
            Offence Type *
          </label>
          <select
            value={offenseType}
            onChange={(e) => handleOffenceChange(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white"
          >
            {OFFENCE_TYPES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
            Fine Amount (SZL) *
          </label>
          <input
            type="number"
            min={0}
            max={10000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-lg font-mono font-black text-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Malagwane Hill Speed Trap"
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
            Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Clocked at 98 km/h in an 80 km/h zone…"
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white resize-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || amount <= 0}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Issue Ticket
          </button>
        </div>
      </form>
    </div>
  );
}
