"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: Props) {
  return (
    <label
      className={cn(
        "inline-flex items-start gap-2.5 cursor-pointer select-none",
        disabled && "opacity-40 cursor-not-allowed",
        className
      )}
    >
      <span
        className={cn(
          "mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0",
          checked
            ? "bg-emerald-500 border-emerald-400"
            : "bg-white/[0.03] border-white/[0.15] hover:border-white/[0.3]"
        )}
        onClick={(e) => {
          if (disabled) return;
          e.preventDefault();
          onChange(!checked);
        }}
      >
        {checked && <Check className="w-3 h-3 text-black" strokeWidth={4} />}
      </span>
      <span className="min-w-0">
        {label && (
          <span className="block text-xs font-bold text-white leading-tight">
            {label}
          </span>
        )}
        {description && (
          <span className="block text-[11px] text-zinc-500 leading-tight mt-0.5">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
