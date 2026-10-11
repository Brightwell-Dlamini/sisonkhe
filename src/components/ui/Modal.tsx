"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./IconButton";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full max-h-[92vh] overflow-hidden bg-[#0F0F10] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col ui-enter",
          SIZES[size]
        )}
      >
        {(title || description) && (
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0">
              {title && (
                <h2 className="text-base font-semibold text-white tracking-tight truncate">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <IconButton icon={X} label="Close" onClick={onClose} size="sm" />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-white/[0.06] bg-white/[0.02] flex justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
