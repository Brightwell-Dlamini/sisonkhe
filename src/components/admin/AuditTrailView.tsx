"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, Shield, Search } from "lucide-react";
import type { AuditEntry } from "@/lib/admin/audits";

export default function AuditTrailView() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "permit" | "sync">("all");

  useEffect(() => {
    void fetch("/api/admin/audits")
      .then((r) => r.json())
      .then((data) => setEntries(data.entries ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (sourceFilter !== "all" && e.source !== sourceFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          e.action.toLowerCase().includes(q) ||
          e.details.toLowerCase().includes(q) ||
          (e.entityId ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entries, search, sourceFilter]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          Security Audit Trail
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Immutable log of permit actions, sync events, and system changes.
        </p>
      </header>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search audit log…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 dark:text-white"
          />
        </div>
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          {(["all", "permit", "sync"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setSourceFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${
                sourceFilter === f
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/50">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Entity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-zinc-100 dark:border-zinc-850"
                >
                  <td className="px-4 py-3 font-mono text-[10px] text-zinc-500 whitespace-nowrap">
                    {new Date(e.timestamp).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        e.source === "permit"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                          : e.source === "sync"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {e.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-zinc-900 dark:text-white">
                    {e.action}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 max-w-md truncate">
                    {e.details}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-zinc-500 truncate">
                    {e.entityId ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
