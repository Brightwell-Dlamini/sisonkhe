/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { AlertTriangle, ShieldCheck, TrendingUp, Truck, CreditCard, Loader2 } from "lucide-react";
import Link from "next/link";

interface Props {
  balanceSzl: number;
  fleetCount: number;
  status: string;
  onReload?: () => void;
  onSend?: () => void;
  onToggleFreeze?: () => Promise<boolean>;
}

export default function OperatorReadinessCard({
  balanceSzl,
  fleetCount,
  status,
  onReload,
  onSend,
  onToggleFreeze,
}: Props) {
  const [freezing, setFreezing] = useState(false);
  const isFrozen = status === "Frozen";
  const isLowBalance = balanceSzl < 250;

  const heading = isFrozen
    ? "Business flow paused"
    : isLowBalance
      ? "Top-up recommended"
      : "Operations ready";

  const detail = isFrozen
    ? "Your Master Card is frozen. Unfreeze it before transfers or permit renewals can continue."
    : isLowBalance
      ? "Funding is running low. Top up before the next fleet movement or renewal batch."
      : "Your balance and fleet coverage look healthy enough to operate the next cycle without interruption.";

  const tone = isFrozen
    ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
    : isLowBalance
      ? "border-sky-500/30 bg-sky-500/10 text-sky-100"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";

  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-center justify-end mb-3">
        <div className="flex gap-2">
          {onReload ? (
            <button onClick={onReload} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold">Top up</button>
          ) : (
            <Link href="/operator/wallet" className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold">Top up</Link>
          )}

          {onSend ? (
            <button onClick={onSend} className="px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-200 text-xs font-bold">Fleet</button>
          ) : (
            <Link href="/operator/fleet" className="px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-200 text-xs font-bold">Fleet</Link>
          )}

          {onToggleFreeze && (
            <button
              onClick={async () => {
                try {
                  setFreezing(true);
                  await onToggleFreeze();
                } finally {
                  setFreezing(false);
                }
              }}
              disabled={freezing}
              className={`px-3 py-2 rounded-xl font-bold text-xs ${
                status === "Frozen"
                  ? "bg-emerald-600 text-black"
                  : "bg-white/[0.03] border border-white/[0.08] text-zinc-200"
              }`}
            >
              {freezing ? <Loader2 className="w-4 h-4 animate-spin" /> : status === "Frozen" ? "Unfreeze" : "Freeze"}
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-current/80">
            {isFrozen ? <AlertTriangle className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Business readiness
          </div>
          <h2 className="text-base font-black text-white sm:text-lg">{heading}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-200/90">{detail}</p>
        </div>

        <div className="grid min-w-[220px] grid-cols-2 gap-2 text-left sm:text-right">
          <div className="rounded-xl border border-white/10 bg-black/10 px-2.5 py-2">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">Balance</div>
            <div className="mt-1 font-mono text-sm font-black text-white">E {balanceSzl.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/10 px-2.5 py-2">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">Fleet</div>
            <div className="mt-1 flex items-center justify-between gap-2 font-mono text-sm font-black text-white">
              <Truck className="h-3.5 w-3.5" />
              {fleetCount}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-200/90">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/10 px-2 py-1">
          <TrendingUp className="h-3 w-3" />
          {status}
        </span>
      </div>
    </div>
  );
}
