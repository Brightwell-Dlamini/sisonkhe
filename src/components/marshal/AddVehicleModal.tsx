"use client";

import { useMemo, useState } from "react";
import { Search, X, Plus, Loader2 } from "lucide-react";
import type { MarshalVehicle } from "@/lib/marshal/queries";

interface Props {
  vehicles: MarshalVehicle[];
  onClose: () => void;
  onAdd: (reg: string) => Promise<{ success: boolean; position?: number; error?: string }>;
}

export default function AddVehicleModal({ vehicles, onClose, onAdd }: Props) {
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const offQueue = useMemo(
    () => vehicles.filter((v) => v.currentQueuePosition === 0),
    [vehicles]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return offQueue;
    const q = search.toLowerCase();
    return offQueue.filter(
      (v) =>
        v.registrationNumber.toLowerCase().includes(q) ||
        (v.vic ?? "").toLowerCase().includes(q) ||
        (v.driverName ?? "").toLowerCase().includes(q)
    );
  }, [offQueue, search]);

  const handleAdd = async (reg: string) => {
    setBusy(reg);
    setError(null);
    const res = await onAdd(reg);
    setBusy(null);
    if (!res.success) {
      setError(res.error ?? "Add failed");
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-white">
              Add Vehicle to Queue
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {offQueue.length} unqueued {offQueue.length === 1 ? "vehicle" : "vehicles"} in your scope
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl p-3 text-xs">
              {error}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by plate, VIC, or driver…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500 border border-dashed border-white/[0.06] rounded-xl">
              {offQueue.length === 0
                ? "All vehicles are already in the queue."
                : "No vehicles match your search."}
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filtered.map((v) => (
                <div
                  key={v.registrationNumber}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">
                        {v.registrationNumber}
                      </span>
                      {v.vic && (
                        <span className="font-mono text-[10px] text-emerald-400">
                          {v.vic}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {v.driverName ?? "Unassigned"} • {v.status}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdd(v.registrationNumber)}
                    disabled={busy === v.registrationNumber}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-xs font-bold flex items-center gap-1.5"
                  >
                    {busy === v.registrationNumber ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                    Queue
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
