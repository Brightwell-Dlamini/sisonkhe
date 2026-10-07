/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marshal-facing queue intelligence panel.
 * Shows recommended next load and compliance/fairness holds.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Lightbulb,
  Loader2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

interface QueueSuggestion {
  id: string;
  kind: string;
  severity: "info" | "medium" | "high" | "critical";
  title: string;
  detail: string;
  vehicleReg: string | null;
  score: number;
  action?: string;
}

interface QueueIntelligenceResult {
  generatedAt: string;
  queueLength: number;
  suggestions: QueueSuggestion[];
  recommendedNext: string | null;
}

const severityClass: Record<string, string> = {
  info: "border-emerald-800/40 bg-emerald-950/20 text-emerald-200",
  medium: "border-amber-800/40 bg-amber-950/20 text-amber-200",
  high: "border-orange-800/50 bg-orange-950/30 text-orange-200",
  critical: "border-red-800/50 bg-red-950/30 text-red-200",
};

export default function QueueSuggestionsPanel({
  routeId,
  className = "",
}: {
  routeId?: string | null;
  className?: string;
}) {
  const [data, setData] = useState<QueueIntelligenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = routeId ? `?routeId=${encodeURIComponent(routeId)}` : "";
      const res = await fetch(`/api/marshal/queue/suggestions${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-[#0F0F10] p-4 space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          Queue intelligence
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="p-1.5 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] text-zinc-400"
          aria-label="Refresh suggestions"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-400 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="flex flex-wrap gap-2 text-[11px] text-zinc-500">
            <span>{data.queueLength} in queue</span>
            {data.recommendedNext && (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                Next <ArrowRight className="w-3 h-3" /> {data.recommendedNext}
              </span>
            )}
          </div>

          {data.suggestions.length === 0 ? (
            <p className="text-xs text-zinc-500 py-2">
              No issues detected. Queue looks healthy.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.suggestions.slice(0, 6).map((s) => (
                <li
                  key={s.id}
                  className={`rounded-xl border px-3 py-2 ${severityClass[s.severity] ?? severityClass.info}`}
                >
                  <div className="flex items-start gap-2">
                    {(s.severity === "critical" || s.severity === "high") && (
                      <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold">{s.title}</div>
                      <div className="text-[11px] opacity-80 mt-0.5">{s.detail}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {!data && loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
        </div>
      )}
    </div>
  );
}
