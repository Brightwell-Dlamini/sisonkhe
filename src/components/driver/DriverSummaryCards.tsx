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
      label: "Trips today",
      value: summary.tripsToday.toString(),
      sub: `${summary.tripsWeek} this week`,
      icon: Car,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Passengers",
      value: summary.passengersToday.toString(),
      sub: `${summary.passengersMonth} this month`,
      icon: Users,
      color: "text-sky-400",
      bg: "bg-sky-500/10",
    },
    {
      label: "Revenue",
      value: `E${summary.revenueToday.toFixed(0)}`,
      sub: `E${summary.revenueMonth.toFixed(0)} this month`,
      icon: Coins,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Month trips",
      value: summary.tripsMonth.toString(),
      sub: `${summary.passengersMonth} pax total`,
      icon: TrendingUp,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
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
            <div className="text-micro mt-0.5">{c.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
