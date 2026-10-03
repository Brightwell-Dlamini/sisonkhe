"use client";

import { useEffect, useState } from "react";

interface Props {
  variant?: "compact" | "wall";
}

export default function LiveClock({ variant = "compact" }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  if (variant === "wall") {
    return (
      <div className="font-mono tabular-nums">
        <div className="text-5xl font-black text-white tracking-tight leading-none">
          {hh}
          <span className="text-emerald-500 animate-blink">:</span>
          {mm}
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mt-1">
          {ss}s · SZ Local
        </div>
      </div>
    );
  }

  return (
    <div className="font-mono tabular-nums text-right">
      <div className="text-xl font-black text-white tracking-tight leading-none">
        {hh}
        <span className="text-emerald-500">:</span>
        {mm}
        <span className="text-zinc-600 text-sm">:</span>
        <span className="text-zinc-500 text-sm">{ss}</span>
      </div>
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 mt-0.5">
        Live
      </div>
    </div>
  );
}
