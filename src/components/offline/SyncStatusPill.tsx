"use client";

import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useOutbox } from "@/hooks/useOutbox";

export default function SyncStatusPill() {
  const online = useOnlineStatus();
  const { pending } = useOutbox();

  if (!online) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono text-[10px] font-black uppercase tracking-wider">
        <WifiOff className="w-3 h-3" />
        Offline{pending > 0 && <span> ({pending})</span>}
      </span>
    );
  }

  if (pending > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono text-[10px] font-black uppercase tracking-wider">
        <RefreshCw className="w-3 h-3 animate-spin" />
        Syncing ({pending})
      </span>
    );
  }

  return (
    <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-black uppercase tracking-wider">
      <Wifi className="w-3 h-3" />
      Synced
    </span>
  );
}
