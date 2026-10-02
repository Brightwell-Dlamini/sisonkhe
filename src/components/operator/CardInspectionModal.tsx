"use client";

import { useEffect, useState } from "react";
import {
  X,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
} from "lucide-react";
import type { VehicleCardDetail } from "@/lib/operator/queries";

interface Props {
  registrationNumber: string;
  onClose: () => void;
}

export default function CardInspectionModal({ registrationNumber, onClose }: Props) {
  const [card, setCard] = useState<VehicleCardDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/operator/vehicles/${encodeURIComponent(registrationNumber)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCard(data.card);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [registrationNumber]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white">
              Vehicle Card
            </h3>
            <p className="text-[11px] text-zinc-500 font-mono">
              {registrationNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          )}

          {card && (
            <>
              {/* Card visual (small) */}
              <div className="rounded-2xl p-5 bg-gradient-to-br from-blue-500 to-blue-700 text-white space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono opacity-70">
                    Vehicle Card
                  </span>
                  <ShieldCheck className="w-4 h-4 opacity-80" />
                </div>
                <div className="font-mono font-black text-lg tracking-wider">
                  {card.cardNumber ?? "—"}
                </div>
                <div className="flex items-end justify-between pt-3 border-t border-white/20">
                  <div>
                    <div className="text-[10px] uppercase opacity-70">Driver</div>
                    <div className="text-xs font-bold">
                      {card.driverName ?? "Unassigned"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase opacity-70">Balance</div>
                    <div className="text-xl font-mono font-black">
                      E{card.balanceSzl.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white mb-2">
                  Recent Transactions
                </h4>
                {card.transactions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-500">
                    No transactions yet.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-64 overflow-y-auto">
                    {card.transactions.map((tx) => {
                      const isCredit = tx.direction === "CREDIT";
                      return (
                        <div
                          key={tx.id}
                          className="py-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isCredit
                                  ? "bg-emerald-100 text-emerald-600"
                                  : "bg-blue-100 text-blue-600"
                              }`}
                            >
                              {isCredit ? (
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                {tx.description}
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono">
                                {new Date(tx.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div
                            className={`font-mono font-bold text-xs shrink-0 ${
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
