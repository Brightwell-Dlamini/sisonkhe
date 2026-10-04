"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, AlertOctagon, CheckCircle2 } from "lucide-react";
import type { SystemError } from "@/lib/super/errors";

const SEVERITY_STYLES: Record<string, string> = {
  Critical: "bg-red-600 text-white",
  High: "bg-red-500/20 text-red-500",
  Medium: "bg-amber-500/20 text-amber-600",
  Low: "bg-zinc-500/20 text-zinc-500",
};

export default function ErrorHub() {
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | SystemError["status"]>("All");
  const [selected, setSelected] = useState<SystemError | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/super/errors");
    if (res.ok) setErrors((await res.json()).errors ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, status: SystemError["status"]) => {
    await fetch(`/api/super/errors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    void load();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const filtered = errors.filter((e) => filter === "All" || e.status === filter);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-amber-600" />
          Error Hub
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          System-wide exception tracking.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-4 space-y-3">
          <div className="flex gap-1 flex-wrap">
            {(["All", "Pending", "Investigating", "Resolved"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                  filter === f
                    ? "bg-amber-500 text-black"
                    : "bg-white/[0.06] text-zinc-500"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center text-xs text-zinc-500 py-8">
                No errors match.
              </div>
            ) : (
              filtered.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className={`w-full text-left p-3 rounded-xl border text-xs ${
                    selected?.id === e.id
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300"
                      : "bg-white/[0.03] border-white/[0.06]"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${SEVERITY_STYLES[e.severity]}`}>
                      {e.severity}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">{e.status}</span>
                  </div>
                  <div className="font-bold text-white mt-1.5 line-clamp-1">
                    {e.message}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    {e.module} \u2022 {new Date(e.timestamp).toLocaleTimeString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5">
          {selected ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-white/[0.06] pb-3">
                <div>
                  <h3 className="text-sm font-black uppercase text-white">
                    {selected.module}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    {selected.id}
                  </p>
                </div>
                <select
                  value={selected.status}
                  onChange={(e) => updateStatus(selected.id, e.target.value as any)}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-1 text-xs font-bold text-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="Investigating">Investigating</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
                <div className="text-zinc-500 mb-1">Message</div>
                <div className="font-mono font-bold text-red-600 dark:text-red-400">
                  {selected.message}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-zinc-500">Affected User</div>
                  <div className="font-bold text-white">{selected.affectedUser ?? "\u2014"}</div>
                </div>
                <div>
                  <div className="text-zinc-500">Timestamp</div>
                  <div className="font-mono text-zinc-300">{new Date(selected.timestamp).toLocaleString()}</div>
                </div>
              </div>

              {Object.keys(selected.context).length > 0 && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono">
                  <div className="text-zinc-500 mb-1">Context</div>
                  <pre className="text-zinc-300 overflow-x-auto">
                    {JSON.stringify(selected.context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 text-zinc-400">
              <AlertOctagon className="w-10 h-10 mb-2 text-zinc-300" />
              <div className="text-sm font-bold">Select an error</div>
              <div className="text-xs">to view details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
