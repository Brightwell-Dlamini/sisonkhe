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
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      label: "Fees Collected",
      value: `E ${summary.feesCollectedToday.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`,
      icon: Coins,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      label: "In Queue",
      value: summary.activeQueueLength.toString(),
      icon: Clock,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      label: "Delayed",
      value: summary.delayedCount.toString(),
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/40",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4"
          >
            <div className={`w-8 h-8 rounded-lg ${c.bg} ${c.color} flex items-center justify-center mb-2`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
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
