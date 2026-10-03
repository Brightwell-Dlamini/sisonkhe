"use client";

import BrandMark from "@/components/common/BrandMark";

export default function LoadingKiosk() {
  return (
    <div className="kiosk-root flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <BrandMark size="md" showSubtitle inverse />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
            Connecting to terminal\u2026
          </span>
        </div>
      </div>
    </div>
  );
}
