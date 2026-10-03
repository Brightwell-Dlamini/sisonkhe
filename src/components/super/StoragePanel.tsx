"use client";

import { useEffect, useState } from "react";
import { Loader2, HardDrive } from "lucide-react";
import type { StorageEstimate } from "@/lib/super/storage";

export default function StoragePanel() {
  const [data, setData] = useState<StorageEstimate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/super/storage")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-amber-600" />
          Storage Usage
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Row counts and rough storage footprint per table.
        </p>
      </header>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <div className="text-xs text-zinc-500 mb-1">Total rows across all tables</div>
        <div className="text-3xl font-mono font-black text-zinc-900 dark:text-white">
          {data.totalRows.toLocaleString()}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/50">
              <th className="px-4 py-3">Table</th>
              <th className="px-4 py-3 text-right">Rows</th>
              <th className="px-4 py-3 text-right">Bar</th>
            </tr>
          </thead>
          <tbody>
            {data.tables.map((t) => {
              const pct = data.totalRows > 0 ? (t.rows / data.totalRows) * 100 : 0;
              return (
                <tr key={t.name} className="border-b border-zinc-100 dark:border-zinc-850">
                  <td className="px-4 py-2 font-mono text-zinc-700 dark:text-zinc-300">
                    {t.name}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-zinc-900 dark:text-white">
                    {t.rows.toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
