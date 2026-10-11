"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ElementType;
  label: string;
  tone?: "neutral" | "danger" | "emerald";
  size?: "sm" | "md" | "lg";
}

const TONES = {
  neutral: "text-zinc-400 hover:text-white hover:bg-white/[0.06]",
  danger: "text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10",
  emerald: "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10",
};

const SIZES = {
  sm: "min-w-9 min-h-9 w-9 h-9",
  md: "min-w-11 min-h-11 w-11 h-11",
  lg: "min-w-12 min-h-12 w-12 h-12",
};

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { icon: Icon, label, tone = "neutral", size = "md", className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-xl transition-colors cursor-pointer touch-manipulation",
        TONES[tone],
        SIZES[size],
        className
      )}
      {...rest}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
});

IconButton.displayName = "IconButton";
