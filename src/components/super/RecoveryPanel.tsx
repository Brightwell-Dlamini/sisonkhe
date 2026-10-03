"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Database, Plus, RotateCw } from "lucide-react";
import type { Snapshot } from "@/lib/super/snapshots";

export default function RecoveryPanel() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/super/snapshots");
    if (res.ok) setSnapshots((await res.json()).snapshots ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    const label = prompt("Snapshot label:", `Manual snapshot ${new Date().toLocaleString()}`);
    if (!label) return;
    setCreating(true);
    await fetch("/api/super/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    setCreating(false);
    void load();
  };

  const restore = async (s: Snapshot) => {
    if (!confirm(`Restore from "${s.label}"? This will overwrite current data.`)) return;
    setRestoring(s.id);
    await fetch(`/api/super/snapshots/${s.id}/restore`, { method: "POST" });
    setRestoring(null);
    alert("Restore complete");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-600" />
            Disaster Recovery
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Create and restore database snapshots.
          </p>
        </div>
        <button
          onClick={create}
          disabled={creating}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5"
        >
          {creating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          New Snapshot
        </button>
      </header>

      {snapshots.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
          <Database className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
          <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
            No snapshots yet
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Create one to enable restore points.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {snapshots.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-zinc-900 dark:text-white text-sm">
                  {s.label}
                </div>
                <div className="text-xs text-zinc-500 font-mono mt-0.5">
                  {new Date(s.timestamp).toLocaleString()} • {s.sizeKb} KB
                </div>
                <div className="text-[10px] text-zinc-400 mt-1">
                  {Object.entries(s.entityCounts)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")}
                </div>
              </div>
              <button
                onClick={() => restore(s)}
                disabled={restoring === s.id}
                className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                {restoring === s.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCw className="w-3.5 h-3.5" />
                )}
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
