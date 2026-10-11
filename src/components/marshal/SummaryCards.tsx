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
      label: "Dispatched",
      value: summary.dispatchedToday.toString(),
      icon: Car,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Fees today",
      value: `E${summary.feesCollectedToday.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`,
      icon: Coins,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "In queue",
      value: summary.activeQueueLength.toString(),
      icon: Clock,
      color: "text-sky-400",
      bg: "bg-sky-500/10",
    },
    {
      label: "Delayed",
      value: summary.delayedCount.toString(),
      icon: AlertTriangle,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="surface-raised p-3.5 sm:p-4">
            <div
              className={`w-9 h-9 rounded-xl ${c.bg} ${c.color} flex items-center justify-center mb-2.5`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-meta">{c.label}</div>
            <div
              className={`text-2xl sm:text-[1.75rem] font-bold font-mono tabular-nums mt-0.5 tracking-tight ${c.color}`}
            >
              {c.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
