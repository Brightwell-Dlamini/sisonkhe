/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

type Props = {
  hasCard: boolean;
  balanceSzl: number;
  fleetCount: number;
};

export default function OperatorOnboardingChecklist({
  hasCard,
  balanceSzl,
  fleetCount,
}: Props) {
  const funded = hasCard && balanceSzl > 0;
  const hasFleet = fleetCount > 0;
  const allDone = hasCard && funded && hasFleet;

  if (allDone) return null;

  const steps = [
    {
      done: hasCard,
      label: "Master card ready",
      detail: hasCard ? "Card on file" : "Contact admin if missing",
      href: "/operator",
    },
    {
      done: funded,
      label: "Fund wallet",
      detail: funded
        ? `Balance E${balanceSzl.toFixed(2)}`
        : "Top up so vehicles can pay rank fees",
      href: "/operator/wallet",
    },
    {
      done: hasFleet,
      label: "Confirm fleet",
      detail: hasFleet
        ? `${fleetCount} vehicle${fleetCount === 1 ? "" : "s"}`
        : "Link or review vehicles",
      href: "/operator/fleet",
    },
  ];

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-950/20 p-4 space-y-3">
      <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">
        Get set up
      </div>
      <p className="text-xs text-zinc-400">
        Finish these before day-to-day operations. Your desk stays focused until
        the basics are in place.
      </p>
      <ul className="space-y-2">
        {steps.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 hover:border-emerald-500/30 transition"
            >
              {s.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <div
                  className={`text-xs font-bold ${
                    s.done ? "text-zinc-400 line-through" : "text-white"
                  }`}
                >
                  {s.label}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">{s.detail}</div>
              </div>
              {!s.done && (
                <ArrowRight className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
