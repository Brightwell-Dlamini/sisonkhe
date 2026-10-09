/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Staff work queue driven by live compliance state (not email-only digest).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Printer,
  Car,
  UserCircle,
} from "lucide-react";

interface WorkItem {
  id: string;
  kind: string;
  severity: "critical" | "high" | "medium";
  title: string;
  detail: string;
  entityType: string;
  entityId: string;
  href: string;
  daysUntil?: number | null;
}

interface Report {
  generatedAt: string;
  items: WorkItem[];
  counts: Record<string, number>;
}

const severityClass = {
  critical: "border-red-500/50 bg-red-950/30 text-red-100",
  high: "border-amber-500/40 bg-amber-950/20 text-amber-100",
  medium: "border-zinc-600 bg-zinc-900/50 text-zinc-200",
};

export default function ComplianceWorkQueue() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/compliance/queue", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setReport(data.data ?? data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = report?.counts ?? {};

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-black uppercase tracking-tight text-white">
            Compliance queue
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Expired and expiring permits, COF, PDP, missing drivers, print backlog.
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ["permit_expired", "Permit expired"],
          ["cof_expired", "COF expired"],
          ["print_pending", "Print pending"],
          ["pdp_expired", "PDP expired"],
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
      ) : report && report.items.length === 0 ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-200 text-center py-12 text-sm font-bold">
          Queue clear — no critical compliance items.
        </div>
      ) : (
        <ul className="space-y-2">
          {(report?.items ?? []).map((item) => (
            <li
              key={item.id}
              className={`rounded-xl border px-4 py-3 flex items-start justify-between gap-3 ${severityClass[item.severity]}`}
            >
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider opacity-70">
                  {item.severity} · {item.kind.replace(/_/g, " ")}
                </div>
                <div className="font-bold text-sm truncate">{item.title}</div>
                <div className="text-[11px] opacity-80 mt-0.5">{item.detail}</div>
              </div>
              <Link
                href={item.href}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-[10px] font-bold uppercase flex items-center gap-1"
              >
                {item.kind === "print_pending" ? (
                  <Printer className="w-3 h-3" />
                ) : item.entityType === "driver" ? (
                  <UserCircle className="w-3 h-3" />
                ) : (
                  <Car className="w-3 h-3" />
                )}
                Open
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {report?.generatedAt && (
        <div className="text-[10px] text-zinc-600 text-center">
          Generated {new Date(report.generatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
