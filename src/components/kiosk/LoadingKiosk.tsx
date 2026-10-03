"use client";

export default function LoadingKiosk() {
  return (
    <div className="kiosk-root flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
            Sisonkhe In Transit
          </span>
        </div>
        <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest animate-pulse">
          Connecting to terminal…
        </div>
      </div>
    </div>
  );
}
