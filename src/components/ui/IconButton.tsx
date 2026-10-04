"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ElementType;
  label: string;
  tone?: "neutral" | "danger" | "emerald";
  size?: "sm" | "md";
}

const TONES = {
  neutral: "text-zinc-500 hover:text-white hover:bg-white/[0.06]",
  danger: "text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10",
  emerald: "text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10",
};

const SIZES = {
  sm: "w-7 h-7",
  md: "w-9 h-9",
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
        "inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer",
        TONES[tone],
        SIZES[size],
        className
      )}
      {...rest}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
});

IconButton.displayName = "IconButton";
