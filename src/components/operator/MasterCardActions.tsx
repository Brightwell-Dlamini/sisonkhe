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
        className="py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-black rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
      >
        <Send className="w-4 h-4" />
        Send Money
      </button>

      <button
        onClick={onReload}
        className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
      >
        <Plus className="w-4 h-4" />
        Reload
      </button>

      <button
        onClick={handleToggle}
        disabled={freezing}
        className={`py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border ${
          isFrozen
            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
            : "bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800"
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
