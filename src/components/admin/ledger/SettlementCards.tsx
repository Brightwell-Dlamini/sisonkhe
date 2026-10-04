/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import {
  Coins,
  ShieldCheck,
  Wrench,
  Building2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { SettlementSummary } from "@/lib/ledger/queries";

interface Props {
  summary: SettlementSummary;
}

function fmt(n: number): string {
  return `E ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function SettlementCards({ summary }: Props) {
  const balanced = Math.abs(summary.balance) < 0.01;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card
          label="Total Collected"
          value={fmt(summary.totalCollected)}
          sub={`${summary.totalDispatches} dispatches`}
          icon={<Coins className="w-5 h-5" />}
          tone="emerald"
        />
        <Card
          label="Total Distributed"
          value={fmt(summary.totalDistributed)}
          sub="to operational, NRTC, maintenance"
          icon={<CheckCircle2 className="w-5 h-5" />}
          tone="cyan"
        />
        <Card
          label="Balance"
          value={fmt(summary.balance)}
          sub={balanced ? "Reconciled ✓" : "Mismatch detected"}
          icon={
            balanced ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )
          }
          tone={balanced ? "emerald" : "rose"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SmallCard
          label="Operational (E20.00 / fee)"
          value={fmt(summary.allocationOperational)}
          icon={<Building2 className="w-4 h-4" />}
        />
        <SmallCard
          label="NRTC (E3.50 / fee)"
          value={fmt(summary.allocationNrtc)}
          icon={<ShieldCheck className="w-4 h-4" />}
        />
        <SmallCard
          label="Maintenance (E1.50 / fee)"
          value={fmt(summary.allocationMaintenance)}
          icon={<Wrench className="w-4 h-4" />}
        />
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone: "emerald" | "cyan" | "rose";
}) {
  const toneMap = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };

  return (
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5">
      <div
        className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${toneMap[tone]}`}
      >
        {icon}
      </div>
      <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="text-2xl font-black font-mono text-white mt-1">{value}</div>
      <div className="text-[10px] text-zinc-500 mt-1">{sub}</div>
    </div>
  );
}

function SmallCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-xl p-4 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/[0.04] text-zinc-400 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 truncate">
          {label}
        </div>
        <div className="text-sm font-black font-mono text-white truncate">
          {value}
        </div>
      </div>
    </div>
  );
}
