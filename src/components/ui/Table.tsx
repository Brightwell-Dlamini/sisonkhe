"use client";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

interface TableProps {
  children: React.ReactNode;
  className?: string;
  /** Wrap in a scroll container with a max height and sticky header */
  stickyHeader?: boolean;
  maxHeight?: string; // e.g. "60vh"
}

export function Table({
  children,
  className,
  stickyHeader,
  maxHeight = "70vh",
}: TableProps) {
  return (
    <div
      className={cn("w-full overflow-x-auto overflow-y-auto", className)}
      style={stickyHeader ? { maxHeight } : undefined}
    >
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Head
// ---------------------------------------------------------------------------

export function TableHead({
  children,
  sticky,
}: {
  children: React.ReactNode;
  sticky?: boolean;
}) {
  return (
    <thead
      className={cn(
        sticky && "sticky top-0 z-10 bg-[#0F0F10]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0F0F10]/80"
      )}
    >
      <tr className="border-b border-white/[0.06] bg-white/[0.02]">
        {children}
      </tr>
    </thead>
  );
}

type Align = "left" | "center" | "right";

interface ThProps {
  children: React.ReactNode;
  align?: Align;
  className?: string;
  /** If set, header is a clickable sort control */
  sortable?: boolean;
  sortDir?: "asc" | "desc" | null;
  onSort?: () => void;
  /** Force a fixed width / min-width on the column */
  width?: string;
}

export function Th({
  children,
  align = "left",
  className,
  sortable,
  sortDir,
  onSort,
  width,
}: ThProps) {
  const content = (
    <span className="inline-flex items-center gap-1">
      {children}
      {sortable && (
        <span
          aria-hidden
          className={cn(
            "transition-opacity",
            sortDir ? "opacity-100" : "opacity-25"
          )}
        >
          {sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : "▼"}
        </span>
      )}
    </span>
  );

  return (
    <th
      scope="col"
      style={width ? { width } : undefined}
      className={cn(
        "px-4 py-3 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500 whitespace-nowrap",
        align === "center" && "text-center",
        align === "right" && "text-right",
        sortable &&
          "cursor-pointer select-none hover:text-zinc-300 transition-colors",
        className
      )}
      onClick={sortable ? onSort : undefined}
      aria-sort={
        sortDir === "asc"
          ? "ascending"
          : sortDir === "desc"
            ? "descending"
            : undefined
      }
    >
      {content}
    </th>
  );
}

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-white/[0.04]">{children}</tbody>;
}

interface TrProps {
  children: React.ReactNode;
  /** When set, the row becomes a clickable button-like element */
  onClick?: () => void;
  className?: string;
  /** Highlight as selected */
  selected?: boolean;
}

export function Tr({ children, onClick, className, selected }: TrProps) {
  const interactive = Boolean(onClick);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <tr
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "button" : undefined}
      aria-selected={selected}
      className={cn(
        "transition-colors outline-none",
        interactive &&
          "cursor-pointer hover:bg-white/[0.035] focus-visible:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-inset",
        selected && "bg-emerald-500/[0.06]",
        !interactive && "hover:bg-white/[0.02]",
        className
      )}
    >
      {children}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Cell
// ---------------------------------------------------------------------------

interface TdProps {
  children: React.ReactNode;
  align?: Align;
  className?: string;
  /** Numeric / monospace-friendly: right-align, tabular digits */
  numeric?: boolean;
  colSpan?: number;
}

export function Td({
  children,
  align = "left",
  className,
  numeric,
  colSpan,
}: TdProps) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-4 py-3 text-zinc-300 align-middle",
        align === "center" && "text-center",
        align === "right" && "text-right",
        numeric && "tabular-nums font-mono",
        className
      )}
    >
      {children}
    </td>
  );
}
