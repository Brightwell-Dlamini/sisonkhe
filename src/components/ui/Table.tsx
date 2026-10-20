"use client";

import { cn } from "@/lib/utils";

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#0F0F10]",
        className
      )}
    >
      <table className="w-full table-fixed text-sm border-collapse">{children}</table>
    </div>
  );
}

/**
 * thead only — callers supply <Tr><Th>…</Th></Tr> so header and body
 * share the same row primitive (no nested <tr>).
 */
export function TableHead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-white/[0.02]">{children}</thead>;
}

interface ThProps {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

export function Th({ children, align = "left", className }: ThProps) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 whitespace-nowrap border-b border-white/[0.06]",
        align === "left" && "text-left",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
    >
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-white/[0.04]">{children}</tbody>;
}

interface TrProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function Tr({ children, onClick, className }: TrProps) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer",
        "hover:bg-white/[0.025]",
        className
      )}
    >
      {children}
    </tr>
  );
}

interface TdProps {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

export function Td({ children, align = "left", className }: TdProps) {
  return (
    <td
      className={cn(
        "px-4 py-3.5 text-zinc-300 align-middle text-[13px]",
        align === "left" && "text-left",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
    >
      {children}
    </td>
  );
}
