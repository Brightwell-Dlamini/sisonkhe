"use client";

import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple"
  | "outline";
type Size = "sm" | "md";

interface Props {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

const VARIANTS: Record<Variant, string> = {
  default: "bg-white/[0.06] text-zinc-300 border-white/[0.08]",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/25",
  danger: "bg-rose-500/10 text-rose-400 border-rose-500/25",
  info: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/25",
  outline: "bg-transparent text-zinc-400 border-white/[0.12]",
};

const SIZES: Record<Size, string> = {
  sm: "h-5 px-2 text-[9px] gap-1",
  md: "h-6 px-2.5 text-[10px] gap-1.5",
};

const DOT_COLORS: Record<Variant, string> = {
  default: "bg-zinc-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-rose-400",
  info: "bg-cyan-400",
  purple: "bg-purple-400",
  outline: "bg-zinc-500",
};

export function Badge({
  variant = "default",
  size = "md",
  children,
  dot,
  pulse,
  className,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border font-mono font-black uppercase tracking-[0.1em] whitespace-nowrap",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            DOT_COLORS[variant],
            pulse && "kiosk-dot"
          )}
        />
      )}
      {children}
    </span>
  );
}
