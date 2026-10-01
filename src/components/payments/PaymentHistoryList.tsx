/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useEffect, useState } from "react";
import { Loader2, Inbox, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { PaymentIntent } from "@/lib/payments/types";

const STATUS_STYLES: Record<string, string> = {
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  processing:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  cancelled:
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  expired:
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const PURPOSE_LABELS: Record<string, string> = {
  master_card_topup: "Master Card Top-Up",
  vehicle_card_topup: "Vehicle Card Top-Up",
  rank_fee: "Rank Fee",
  renewal_fee: "Renewal Fee",
};

export default function PaymentHistoryList() {
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/payments/intent", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        setIntents(data.intents ?? []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
      </div>
    );
  }

  if (intents.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center py-16 px-4">
        <Inbox className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
        <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
          No payments yet
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          Payments you initiate will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/50">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Purpose</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ref</th>
            </tr>
          </thead>
          <tbody>
            {intents.map((i) => (
              <tr
                key={i.id}
                className="border-b border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-950/50"
              >
                <td className="px-4 py-3 font-mono text-zinc-700 dark:text-zinc-300 text-[11px]">
                  {new Date(i.createdAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {PURPOSE_LABELS[i.purpose] ?? i.purpose}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 uppercase text-[10px] font-bold">
                  {i.providerId}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900 dark:text-white">
                  E {i.amountSzl.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${STATUS_STYLES[i.status] ?? ""}`}
                  >
                    {i.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-zinc-500 truncate max-w-[120px]">
                  {i.providerReference ?? i.clientReference}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
