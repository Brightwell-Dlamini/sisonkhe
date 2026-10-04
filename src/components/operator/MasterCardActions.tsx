"use client";

import { useState } from "react";
import {
  Plus,
  Snowflake,
  Flame,
  Send,
  Loader2,
} from "lucide-react";

interface Props {
  status: "Active" | "Frozen";
  onReload: () => void;
  onSend: () => void;
  onToggleFreeze: () => Promise<boolean>;
}

export default function MasterCardActions({
  status,
  onReload,
  onSend,
  onToggleFreeze,
}: Props) {
  const [freezing, setFreezing] = useState(false);
  const isFrozen = status === "Frozen";

  const handleToggle = async () => {
    setFreezing(true);
    await onToggleFreeze();
    setFreezing(false);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-md mx-auto">
      <button
        onClick={onSend}
        disabled={isFrozen}
        className="py-3 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" />
        Send Money
      </button>

      <button
        onClick={onReload}
        className="py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Reload
      </button>

      <button
        onClick={handleToggle}
        disabled={freezing}
        className={`py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border ${
          isFrozen
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
            : "bg-white/[0.04] text-zinc-300 border-white/[0.08] hover:bg-white/[0.08]"
        }`}
      >
        {freezing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isFrozen ? (
          <Flame className="w-4 h-4" />
        ) : (
          <Snowflake className="w-4 h-4" />
        )}
        {isFrozen ? "Unfreeze" : "Freeze"}
      </button>
    </div>
  );
}
