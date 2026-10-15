"use client";

import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { error, className, children, ...rest },
  ref
) {
  return (
    <div className="w-full">
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "w-full min-h-11 h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 pr-10 text-[15px] font-medium text-white focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.04] appearance-none cursor-pointer transition-colors",
            error && "border-rose-500/50",
            className
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      </div>
      {error && (
        <p className="mt-1.5 text-[12px] text-rose-400 font-medium">{error}</p>
      )}
    </div>
  );
});

Select.displayName = "Select";
