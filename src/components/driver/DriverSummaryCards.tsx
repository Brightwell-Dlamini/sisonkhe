/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { Car, Users, Coins, TrendingUp } from "lucide-react";
import type { DriverSummary } from "@/lib/driver/queries";

interface Props {
  summary: DriverSummary;
}

export default function DriverSummaryCards({ summary }: Props) {
  const cards = [
    {
      label: "Trips Today",
      value: summary.tripsToday.toString(),
      sub: `${summary.tripsWeek} this week`,
      icon: Car,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      label: "Passengers Today",
      value: summary.passengersToday.toString(),
      sub: `${summary.passengersMonth} this month`,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      label: "Revenue Today",
      value: `E ${summary.revenueToday.toFixed(0)}`,
      sub: `E ${summary.revenueMonth.toFixed(0)} this month`,
      icon: Coins,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      label: "Month Trips",
      value: summary.tripsMonth.toString(),
      sub: `${summary.passengersMonth} pax total`,
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/40",
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
            <div
              className={`w-8 h-8 rounded-lg ${c.bg} ${c.color} flex items-center justify-center mb-2`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
              {c.label}
            </div>
            <div className={`text-xl font-black font-mono mt-0.5 ${c.color}`}>
              {c.value}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{c.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
