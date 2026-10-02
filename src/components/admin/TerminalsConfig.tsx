"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Building2 } from "lucide-react";
import type { RegionConfigRow } from "@/lib/admin/terminals";

export default function TerminalsConfig() {
  const [terminals, setTerminals] = useState<RegionConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/terminals", { cache: "no-store" });
      const data = await res.json();
      setTerminals(data.terminals ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const update = (region: string, patch: Partial<RegionConfigRow>) => {
    setTerminals((prev) =>
      prev.map((t) => (t.region === region ? { ...t, ...patch } : t))
    );
  };

  const save = async (region: string) => {
    const t = terminals.find((x) => x.region === region);
    if (!t) return;
    setSaving(region);
    try {
      await fetch(`/api/admin/terminals/${encodeURIComponent(region)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terminalName: t.terminalName,
          emergencyNumber: t.emergencyNumber,
          announcement: t.announcement,
        }),
      });
    } finally {
      setSaving(null);
    }
  };

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
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
          Regional Terminals
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Configure terminal names, emergency numbers, and announcements.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {terminals.map((t) => (
          <div
            key={t.region}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <Building2 className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white">
                {t.region} Region
              </h3>
            </div>

            <Field label="Terminal Name">
              <input
                value={t.terminalName}
                onChange={(e) => update(t.region, { terminalName: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white"
              />
            </Field>

            <Field label="Emergency Number">
              <input
                value={t.emergencyNumber ?? ""}
                onChange={(e) => update(t.region, { emergencyNumber: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-900 dark:text-white"
              />
            </Field>

            <Field label="Announcement">
              <textarea
                rows={2}
                value={t.announcement ?? ""}
                onChange={(e) => update(t.region, { announcement: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white resize-none"
              />
            </Field>

            <div className="flex justify-end">
              <button
                onClick={() => save(t.region)}
                disabled={saving === t.region}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                {saving === t.region ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
