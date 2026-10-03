"use client";

import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useOutbox } from "@/hooks/useOutbox";
import { syncNow } from "@/lib/offline/sync";
import { useState } from "react";

export default function OfflineBanner() {
  const online = useOnlineStatus();
  const { pending, failed } = useOutbox();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncNow();
    } finally {
      setSyncing(false);
    }
  };

  if (online && pending === 0 && failed === 0) return null;

  if (!online && pending > 0) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between font-mono text-[11px]">
        <span className="flex items-center gap-2 text-amber-400 font-bold">
          <WifiOff className="w-3.5 h-3.5" />
          Offline — {pending} {pending === 1 ? "action" : "actions"} queued
        </span>
      </div>
    );
  }

  if (!online) {
    return (
      <div className="bg-zinc-800/50 border-b border-white/[0.06] px-4 py-2 flex items-center gap-2 font-mono text-[11px] text-zinc-400">
        <WifiOff className="w-3.5 h-3.5" />
        You are offline. Some features may be unavailable.
      </div>
    );
  }

  if (failed > 0) {
    return (
      <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2 flex items-center justify-between font-mono text-[11px]">
        <span className="flex items-center gap-2 text-rose-400 font-bold">
          <AlertTriangle className="w-3.5 h-3.5" />
          {failed} {failed === 1 ? "action" : "actions"} failed to sync
        </span>
        <button
          onClick={() => {
            if (confirm("Clear failed actions?")) {
              import("@/lib/offline/outbox").then((m) => m.clearPermanentlyFailed());
            }
          }}
          className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] uppercase tracking-wider"
        >
          Clear
        </button>
      </div>
    );
  }

  return (
    <div className="bg-blue-500/10 border-b border-blue-500/30 px-4 py-2 flex items-center justify-between font-mono text-[11px]">
      <span className="flex items-center gap-2 text-blue-400 font-bold">
        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
        Syncing {pending} {pending === 1 ? "action" : "actions"}…
      </span>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] uppercase tracking-wider disabled:opacity-50"
      >
        Sync now
      </button>
    </div>
  );
}
