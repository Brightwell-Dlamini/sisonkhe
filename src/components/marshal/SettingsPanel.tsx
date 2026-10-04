"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Loader2 } from "lucide-react";

export default function SettingsPanel() {
  const [moveLoadingToBottom, setMoveLoadingToBottom] = useState(true);
  const [rankFee, setRankFee] = useState(25);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("marshal_move_loading_to_bottom");
    if (stored !== null) setMoveLoadingToBottom(stored === "true");
    const fee = localStorage.getItem("marshal_rank_fee");
    if (fee) setRankFee(Number(fee));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    localStorage.setItem("marshal_move_loading_to_bottom", String(moveLoadingToBottom));
    localStorage.setItem("marshal_rank_fee", String(rankFee));
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
        <Settings className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-black uppercase tracking-wider text-white">
          Queue Settings
        </h3>
      </div>

      <div className="flex items-start justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div>
          <div className="text-sm font-bold text-white">
            Move Loading Vehicle to Bottom
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">
            After a vehicle loads, send it to the back of the queue for its next dispatch.
          </div>
        </div>
        <input
          type="checkbox"
          checked={moveLoadingToBottom}
          onChange={(e) => setMoveLoadingToBottom(e.target.checked)}
          className="mt-1 w-4 h-4 rounded text-emerald-500"
        />
      </div>

      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
        <div className="text-sm font-bold text-white">Rank Fee (E)</div>
        <div className="text-xs text-zinc-500">
          The fee charged per dispatch. National default is E25.00.
        </div>
        <input
          type="number"
          min={0}
          max={200}
          value={rankFee}
          onChange={(e) => setRankFee(Number(e.target.value) || 0)}
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500/40"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        {saved && (
          <span className="text-xs font-bold text-emerald-400">Settings saved</span>
        )}
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black rounded-xl text-xs font-black uppercase flex items-center gap-1.5"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          Save Settings
        </button>
      </div>
    </div>
  );
}
