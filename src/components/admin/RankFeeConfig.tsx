"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, Settings } from "lucide-react";

export default function RankFeeConfig() {
  const [rankFee, setRankFee] = useState(25);
  const [operational, setOperational] = useState(20);
  const [nrtc, setNrtc] = useState(3.5);
  const [maintenance, setMaintenance] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/config/rank-fee")
      .then((r) => r.json())
      .then((data) => {
        setRankFee(data.rankFee ?? 25);
        setOperational(data.splitOperational ?? 20);
        setNrtc(data.splitNRTC ?? 3.5);
        setMaintenance(data.splitMaintenance ?? 1.5);
      })
      .finally(() => setLoading(false));
  }, []);

  const total = operational + nrtc + maintenance;
  const matches = Math.abs(total - rankFee) < 0.01;

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/config/rank-fee", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rankFee,
        splitOperational: operational,
        splitNRTC: nrtc,
        splitMaintenance: maintenance,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <header>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-600" />
          System Configuration
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          National rank fee and allocation split.
        </p>
      </header>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
        <div>
          <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
            National Rank Fee (SZL)
          </label>
          <input
            type="number"
            step="0.01"
            value={rankFee}
            onChange={(e) => setRankFee(Number(e.target.value))}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white"
          />
        </div>

        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
            Allocation Split
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Operational">
              <input
                type="number"
                step="0.01"
                value={operational}
                onChange={(e) => setOperational(Number(e.target.value))}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-900 dark:text-white"
              />
            </Field>
            <Field label="NRTC">
              <input
                type="number"
                step="0.01"
                value={nrtc}
                onChange={(e) => setNrtc(Number(e.target.value))}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-900 dark:text-white"
              />
            </Field>
            <Field label="Maintenance">
              <input
                type="number"
                step="0.01"
                value={maintenance}
                onChange={(e) => setMaintenance(Number(e.target.value))}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-900 dark:text-white"
              />
            </Field>
          </div>

          <div
            className={`p-3 rounded-xl text-xs ${
              matches
                ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                : "bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
            }`}
          >
            Split total: <strong className="font-mono">E {total.toFixed(2)}</strong>
            {!matches && (
              <>
                {" "}
                — does not match rank fee (E {rankFee.toFixed(2)})
              </>
            )}
            {matches && " ✓ reconciles"}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          {saved && (
            <span className="text-xs font-bold text-emerald-600">Saved</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
