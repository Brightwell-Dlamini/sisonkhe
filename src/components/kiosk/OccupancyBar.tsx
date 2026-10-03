"use client";

interface Props {
  filled: number;
  total: number;
  boarding?: boolean;
  showLabel?: boolean;
}

export default function OccupancyBar({
  filled,
  total,
  boarding = false,
  showLabel = true,
}: Props) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  const color =
    pct >= 100
      ? "bg-violet-500"
      : pct >= 85
      ? "bg-rose-500"
      : pct >= 60
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
            Occupancy
          </span>
          <span className="font-mono text-xs font-black text-zinc-100 tabular-nums">
            {filled}
            <span className="text-zinc-500">/{total}</span>
          </span>
        </div>
      )}
      <div className="relative h-1.5 rounded-full overflow-hidden bg-zinc-800/80">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
        {boarding && pct < 100 && (
          <div className="absolute inset-0 kiosk-shimmer pointer-events-none" />
        )}
      </div>
    </div>
  );
}
