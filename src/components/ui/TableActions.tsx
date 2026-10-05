"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TableAction {
  label: string;
  onSelect: () => void;
  tone?: "neutral" | "danger";
  icon?: React.ElementType;
}

interface Props {
  actions: TableAction[];
  label?: string;
}

export function TableActions({ actions, label = "Row actions" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
          "text-zinc-500 hover:text-white hover:bg-white/[0.06]",
          open && "bg-white/[0.06] text-white"
        )}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute right-0 top-full mt-1 z-30 min-w-[160px]",
            "rounded-xl border border-white/[0.08] bg-[#141416] shadow-2xl shadow-black/50",
            "py-1 overflow-hidden"
          )}
        >
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  action.onSelect();
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors",
                  action.tone === "danger"
                    ? "text-rose-400 hover:bg-rose-500/10"
                    : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
