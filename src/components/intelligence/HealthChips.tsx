"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { HealthSignal } from "@/lib/intelligence/entityHealth";
import type { Severity } from "@/lib/intelligence/types";

function chipClass(sev: Severity): string {
  switch (sev) {
    case "critical":
      return "bg-rose-500/15 text-rose-400 border-rose-500/25";
    case "high":
      return "bg-amber-500/15 text-amber-400 border-amber-500/25";
    case "medium":
      return "bg-sky-500/15 text-sky-400 border-sky-500/25";
    case "low":
      return "bg-white/[0.06] text-zinc-400 border-white/[0.08]";
    default:
      return "bg-white/[0.04] text-zinc-500 border-white/[0.06]";
  }
}

export function HealthChips({
  signals,
  max = 3,
}: {
  signals: HealthSignal[];
  max?: number;
}) {
  if (!signals.length) return null;
  const shown = signals.slice(0, max);
  const extra = signals.length - shown.length;

  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((s) => (
        <span
          key={s.id}
          title={s.detail}
          className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${chipClass(
            s.severity
          )}`}
        >
          {s.label}
        </span>
      ))}
      {extra > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md border border-white/[0.06] text-[9px] font-bold text-zinc-500">
          +{extra}
        </span>
      )}
    </div>
  );
}
