/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Compact status: coloured dot + short label (not a screaming pill).
 */

"use client";

import { cn } from "@/lib/utils";

export type StatusTone = "ok" | "wait" | "stop" | "info" | "neutral";

const TONE: Record<StatusTone, { dot: string; text: string }> = {
  ok: { dot: "bg-emerald-400", text: "text-emerald-300" },
  wait: { dot: "bg-amber-400", text: "text-amber-200" },
  stop: { dot: "bg-rose-400", text: "text-rose-300" },
  info: { dot: "bg-sky-400", text: "text-sky-200" },
  neutral: { dot: "bg-zinc-500", text: "text-zinc-400" },
};

interface Props {
  tone?: StatusTone;
  label: string;
  className?: string;
}

export function StatusDot({ tone = "neutral", label, className }: Props) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] font-medium",
        t.text,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", t.dot)} />
      {label}
    </span>
  );
}

export function statusToneFromLabel(label: string): StatusTone {
  const s = label.toLowerCase();
  if (
    ["active", "valid", "ok", "departed", "loading", "issued", "success"].some(
      (k) => s.includes(k)
    )
  )
    return "ok";
  if (["delay", "pending", "waiting", "expir", "attention"].some((k) => s.includes(k)))
    return "wait";
  if (
    ["suspend", "block", "fail", "break", "danger", "error", "inactive"].some(
      (k) => s.includes(k)
    )
  )
    return "stop";
  if (["sync", "info", "online"].some((k) => s.includes(k))) return "info";
  return "neutral";
}
