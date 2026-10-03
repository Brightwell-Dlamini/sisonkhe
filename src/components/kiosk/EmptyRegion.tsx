"use client";

import { Radio } from "lucide-react";

interface Props {
  region: string;
}

export default function EmptyRegion({ region }: Props) {
  return (
    <div className="kiosk-surface rounded-2xl p-16 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        <Radio className="w-7 h-7 text-zinc-700" />
      </div>
      <div className="text-lg font-black text-white uppercase tracking-tight font-space">
        No active departures
      </div>
      <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">
        {region} Region has no vehicles currently scheduled. Check back shortly
        or select a different terminal.
      </p>
    </div>
  );
}
