"use client";

import { cn } from "@/lib/utils";

export type KioskStatus =
  | "Loading"
  | "Waiting"
  | "Full"
  | "Departed"
  | "Delayed"
  | "Breakdown"
  | "Returning"
  | "Offline";

interface Props {
  status: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  pulse?: boolean;
}

const CONFIG: Record<
  string,
  { label: string; color: string; dot: string; glow: string }
> = {
  Loading: {
    label: "BOARDING NOW",
    color: "text-emerald-400",
    dot: "bg-emerald-400",
    glow: "shadow-emerald-400/40",
  },
  Waiting: {
    label: "IN QUEUE",
    color: "text-cyan-400",
    dot: "bg-cyan-400",
    glow: "shadow-cyan-400/40",
  },
  Full: {
    label: "CABIN FULL",
    color: "text-violet-400",
    dot: "bg-violet-400",
    glow: "shadow-violet-400/40",
  },
  Departed: {
    label: "DEPARTED",
    color: "text-zinc-500",
    dot: "bg-zinc-500",
    glow: "",
  },
  Delayed: {
    label: "DELAYED",
    color: "text-amber-400",
    dot: "bg-amber-400",
    glow: "shadow-amber-400/40",
  },
  Breakdown: {
    label: "BREAKDOWN",
    color: "text-red-400",
    dot: "bg-red-400",
    glow: "shadow-red-400/40",
  },
  Returning: {
    label: "RETURNING",
    color: "text-cyan-300",
    dot: "bg-cyan-300",
    glow: "shadow-cyan-300/40",
  },
  Offline: {
    label: "OFFLINE",
    color: "text-zinc-600",
    dot: "bg-zinc-600",
    glow: "",
  },
};

export default function StatusIndicator({
  status,
  size = "md",
  showLabel = true,
  pulse = false,
}: Props) {
  const cfg = CONFIG[status] ?? CONFIG.Waiting;
  const sizes = {
    sm: { dot: "w-1.5 h-1.5", text: "text-[10px]" },
    md: { dot: "w-2 h-2", text: "text-xs" },
    lg: { dot: "w-2.5 h-2.5", text: "text-sm" },
  }[size];

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "rounded-full",
          sizes.dot,
          cfg.dot,
          pulse && "kiosk-dot",
          cfg.glow && `shadow-[0_0_12px_currentColor]`
        )}
      />
      {showLabel && (
        <span
          className={cn(
            "font-mono font-black uppercase tracking-[0.12em]",
            sizes.text,
            cfg.color
          )}
        >
          {cfg.label}
        </span>
      )}
    </span>
  );
}
