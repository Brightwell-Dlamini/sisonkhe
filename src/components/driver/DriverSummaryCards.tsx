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
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border border-emerald-500/20",
    },
    {
      label: "Passengers Today",
      value: summary.passengersToday.toString(),
      sub: `${summary.passengersMonth} this month`,
      icon: Users,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10 border border-cyan-500/20",
    },
    {
      label: "Revenue Today",
      value: `E ${summary.revenueToday.toFixed(0)}`,
      sub: `E ${summary.revenueMonth.toFixed(0)} this month`,
      icon: Coins,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border border-amber-500/20",
    },
    {
      label: "Month Trips",
      value: summary.tripsMonth.toString(),
      sub: `${summary.passengersMonth} pax total`,
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-500/10 border border-purple-500/20",
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
            <div className="text-[10px] text-zinc-500 mt-0.5">{c.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
