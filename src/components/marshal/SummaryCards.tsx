/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { Car, Coins, Clock, AlertTriangle } from "lucide-react";
import type { MarshalSummary } from "@/lib/marshal/queries";

interface Props {
  summary: MarshalSummary;
}

export default function SummaryCards({ summary }: Props) {
  const cards = [
    {
      label: "Dispatched Today",
      value: summary.dispatchedToday.toString(),
      icon: Car,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border border-emerald-500/20",
    },
    {
      label: "Fees Collected",
      value: `E ${summary.feesCollectedToday.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`,
      icon: Coins,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border border-amber-500/20",
    },
    {
      label: "In Queue",
      value: summary.activeQueueLength.toString(),
      icon: Clock,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10 border border-cyan-500/20",
    },
    {
      label: "Delayed",
      value: summary.delayedCount.toString(),
      icon: AlertTriangle,
      color: "text-rose-400",
      bg: "bg-rose-500/10 border border-rose-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-4"
          >
            <div className={`w-8 h-8 rounded-lg ${c.bg} ${c.color} flex items-center justify-center mb-2`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
              {c.label}
            </div>
            <div className={`text-xl font-black font-mono mt-0.5 ${c.color}`}>
              {c.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
