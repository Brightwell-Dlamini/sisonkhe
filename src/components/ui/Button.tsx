"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leadingIcon?: React.ElementType;
  trailingIcon?: React.ElementType;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-emerald-500 hover:bg-emerald-400 text-black font-bold border border-emerald-400/80 shadow-[0_0_20px_-6px_rgba(16,185,129,0.45)]",
  secondary:
    "bg-white/[0.06] hover:bg-white/[0.10] text-zinc-100 border border-white/[0.08] hover:border-white/[0.15]",
  ghost:
    "bg-transparent hover:bg-white/[0.06] text-zinc-400 hover:text-white",
  danger:
    "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30",
  outline:
    "bg-transparent hover:bg-white/[0.04] text-zinc-300 border border-white/[0.12] hover:border-white/[0.20]",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-9 h-9 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "min-h-11 h-11 px-4 text-sm gap-2 rounded-xl",
  lg: "min-h-12 h-12 px-5 text-[15px] gap-2 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    leadingIcon: Leading,
    trailingIcon: Trailing,
    fullWidth,
    children,
    className,
    disabled,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center select-none transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 touch-manipulation",
        variant === "primary" && "uppercase tracking-wide text-[13px]",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        Leading && <Leading className="w-4 h-4" />
      )}
      {children}
      {!loading && Trailing && <Trailing className="w-4 h-4" />}
    </button>
  );
});

Button.displayName = "Button";
