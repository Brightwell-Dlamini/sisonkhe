"use client";

import { cn } from "@/lib/utils";

interface Props {
  code: string;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "emerald" | "cyan" | "amber" | "violet" | "neutral";
  className?: string;
}

const TONES: Record<string, string> = {
  emerald: "bg-emerald-500 text-black border-emerald-400",
  cyan: "bg-cyan-500 text-black border-cyan-400",
  amber: "bg-amber-500 text-black border-amber-400",
  violet: "bg-violet-500 text-white border-violet-400",
  neutral: "bg-zinc-800 text-white border-zinc-700",
};

const SIZES = {
  sm: "text-[10px] px-2 py-1 rounded-md min-w-[36px]",
  md: "text-xs px-2.5 py-1.5 rounded-lg min-w-[44px]",
  lg: "text-base px-3 py-2 rounded-xl min-w-[56px]",
  xl: "text-2xl px-4 py-3 rounded-2xl min-w-[72px]",
};

export default function RoutePill({
  code,
  size = "md",
  tone = "neutral",
  className,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-mono font-black tracking-wider border shadow-sm shrink-0",
        TONES[tone],
        SIZES[size],
        className
      )}
    >
      {code}
    </span>
  );
}
