"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: React.ElementType;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { leadingIcon: Leading, error, className, ...rest },
  ref
) {
  return (
    <div className="w-full">
      <div className="relative">
        {Leading && (
          <Leading className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        )}
        <input
          ref={ref}
          className={cn(
            "w-full h-10 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 focus:bg-white/[0.04] transition-all",
            Leading && "pl-9",
            error && "border-rose-500/50",
            className
          )}
          {...rest}
        />
      </div>
      {error && (
        <p className="mt-1 text-[10px] text-rose-400 font-medium">{error}</p>
      )}
    </div>
  );
});

Input.displayName = "Input";
