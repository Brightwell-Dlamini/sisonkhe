/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Surfaces payment mismatches, allows retry of failed card credits,
 * and shows recent webhook delivery outcomes.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  Wallet,
  RotateCcw,
  Radio,
} from "lucide-react";

interface ReconIssue {
  id: string;
  kind: string;
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
  entityType: string;
  entityId: string;
  amountSzl?: number;
  ageHours?: number;
}

interface Report {
  generatedAt: string;
  issues: ReconIssue[];
  counts: Record<string, number>;
}

interface WebhookEvent {
  id: string;
  providerId: string;
  providerReference: string | null;
  status: string | null;
  outcome: string;
  applied: boolean;
  errorMessage: string | null;
  receivedAt: string;
}

export default function PaymentReconciliationPanel() {
  const [report, setReport] = useState<Report | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reconRes, whRes] = await Promise.all([
        fetch("/api/admin/reconciliation", { cache: "no-store" }),
        fetch("/api/admin/payments/webhooks", { cache: "no-store" }),
      ]);
      const reconData = await reconRes.json();
      if (!reconRes.ok) throw new Error(reconData.error ?? `HTTP ${reconRes.status}`);
      setReport(reconData.data ?? reconData);

      if (whRes.ok) {
        const whData = await whRes.json();
        setWebhooks((whData.data ?? whData).events ?? []);
      } else {
        setWebhooks([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const retryCredit = async (intentId: string) => {
    setRetrying(intentId);
    setToast(null);
    try {
      const res = await fetch("/api/admin/payments/retry-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Retry failed");
      setToast(
        data.credited
          ? "Credit applied successfully."
          : "Credit already present — nothing to do."
      );
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetrying(null);
    }
  };

  const counts = report?.counts ?? {};

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-500" />
            Payment reconciliation
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Stale intents, completed payments without card credit, pending rank fees, webhook deliveries.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-bold flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          ["intent_success_no_credit", "Paid, no credit"],
          ["intent_pending_stale", "Stale pending"],
          ["rank_fee_pending", "Rank fee pending"],
        ].map(([k, label]) => (
          <div
            key={k}
            className="rounded-xl border border-white/[0.06] bg-[#0F0F10] px-3 py-2"
          >
            <div className="text-[10px] uppercase font-bold text-zinc-500">{label}</div>
            <div className="text-xl font-black text-white">{counts[k] ?? 0}</div>
          </div>
        ))}
      </div>

      {toast && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-200 px-4 py-2 text-xs font-bold">
          {toast}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-800 bg-red-950/40 text-red-300 px-4 py-3 text-xs flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && !report ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        </div>
      ) : report && report.issues.length === 0 ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-200 text-center py-12 text-sm font-bold">
          No payment mismatches in the lookback window.
        </div>
      ) : (
        <ul className="space-y-2">
          {(report?.issues ?? []).map((issue) => (
            <li
              key={issue.id}
              className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                issue.severity === "high"
                  ? "border-red-500/40 bg-red-950/20"
                  : issue.severity === "medium"
                    ? "border-amber-500/30 bg-amber-950/15"
                    : "border-white/[0.06] bg-[#0F0F10]"
              }`}
            >
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  {issue.severity} · {issue.kind.replace(/_/g, " ")}
                </div>
                <div className="font-bold text-sm text-white">{issue.title}</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">{issue.detail}</div>
                {issue.amountSzl != null && (
                  <div className="text-[11px] font-mono text-emerald-400 mt-1">
                    {issue.amountSzl} SZL
                  </div>
                )}
              </div>
              {issue.kind === "intent_success_no_credit" && (
                <button
                  type="button"
                  disabled={retrying === issue.entityId}
                  onClick={() => void retryCredit(issue.entityId)}
                  className="shrink-0 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black uppercase flex items-center gap-1.5"
                >
                  {retrying === issue.entityId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  Retry credit
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Recent webhook deliveries */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
          <Radio className="w-4 h-4 text-sky-500" />
          Recent webhooks
        </h2>
        <p className="text-[11px] text-zinc-500">
          Verified provider callbacks. "already terminal" means the intent was already completed/failed — idempotent skip.
        </p>
        {webhooks.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-[#0F0F10] px-4 py-6 text-center text-xs text-zinc-500">
            No webhook events recorded yet (table may still need migration).
          </div>
        ) : (
          <ul className="space-y-1.5 max-h-80 overflow-y-auto">
            {webhooks.map((ev) => (
              <li
                key={ev.id}
                className="rounded-lg border border-white/[0.06] bg-[#0F0F10] px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]"
              >
                <span className="font-mono text-zinc-400 shrink-0">
                  {new Date(ev.receivedAt).toLocaleString()}
                </span>
                <span className="font-bold uppercase text-zinc-300">{ev.providerId}</span>
                <span
                  className={
                    ev.outcome === "applied"
                      ? "text-emerald-400 font-bold"
                      : ev.outcome === "already_terminal"
                        ? "text-sky-400"
                        : ev.outcome === "error"
                          ? "text-red-400"
                          : "text-zinc-500"
                  }
                >
                  {ev.outcome}
                </span>
                {ev.status && (
                  <span className="text-zinc-400">status={ev.status}</span>
                )}
                {ev.providerReference && (
                  <span className="font-mono text-zinc-500 truncate max-w-[12rem]">
                    {ev.providerReference}
                  </span>
                )}
                {ev.errorMessage && (
                  <span className="text-red-300 truncate max-w-full">{ev.errorMessage}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
