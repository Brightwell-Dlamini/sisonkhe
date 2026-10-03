"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Settings, Timer, Palette } from "lucide-react";

const THEMES = [
  { id: "high_contrast", label: "High Contrast (Default)" },
  { id: "azure", label: "Microsoft Azure Dark" },
  { id: "google_light", label: "Google Cloud Light" },
];

export default function SystemConfigPanel() {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/super/config")
      .then((r) => r.json())
      .then((d) => setConfig(d.config ?? {}))
      .finally(() => setLoading(false));
  }, []);

  const save = async (key: string, value: unknown) => {
    setSaving(key);
    await fetch(`/api/super/config/${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    setSaving(null);
    setSaved(key);
    setTimeout(() => setSaved(null), 2500);
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
          Themes, display cycles, and global platform parameters.
        </p>
      </header>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-purple-600" />
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
            Theme
          </h3>
        </div>
        <select
          value={config.theme ?? "high_contrast"}
          onChange={(e) => {
            setConfig({ ...config, theme: e.target.value });
            void save("theme", e.target.value);
          }}
          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-bold text-zinc-900 dark:text-white"
        >
          {THEMES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        {saved === "theme" && (
          <div className="text-xs text-emerald-600 font-bold">Saved</div>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
            Auto-Switching Display Timer
          </h3>
        </div>
        <p className="text-xs text-zinc-500">
          Seconds between kiosk display rotations. Range: 3–60.
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            min={3}
            max={60}
            value={config.cycle_timer_seconds ?? 12}
            onChange={(e) => setConfig({ ...config, cycle_timer_seconds: Number(e.target.value) })}
            className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white"
          />
          <button
            onClick={() => save("cycle_timer_seconds", config.cycle_timer_seconds)}
            disabled={saving === "cycle_timer_seconds"}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            {saving === "cycle_timer_seconds" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save
          </button>
        </div>
        {saved === "cycle_timer_seconds" && (
          <div className="text-xs text-emerald-600 font-bold">Saved</div>
        )}
      </div>
    </div>
  );
}
