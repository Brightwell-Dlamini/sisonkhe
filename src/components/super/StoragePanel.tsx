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
        <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-amber-600" />
          Storage Usage
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Row counts and rough storage footprint per table.
        </p>
      </header>

      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5">
        <div className="text-xs text-zinc-500 mb-1">Total rows across all tables</div>
        <div className="text-3xl font-mono font-black text-white">
          {data.totalRows.toLocaleString()}
        </div>
      </div>

      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-white/[0.02]">
              <th className="px-4 py-3">Table</th>
              <th className="px-4 py-3 text-right">Rows</th>
              <th className="px-4 py-3 text-right">Bar</th>
            </tr>
          </thead>
          <tbody>
            {data.tables.map((t) => {
              const pct = data.totalRows > 0 ? (t.rows / data.totalRows) * 100 : 0;
              return (
                <tr key={t.name} className="border-b border-white/[0.06]">
                  <td className="px-4 py-2 font-mono text-zinc-300">
                    {t.name}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-white">
                    {t.rows.toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
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
