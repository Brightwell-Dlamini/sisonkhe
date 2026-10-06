/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 0 — Invariant observation UI.
 *
 * Read-only. Displays the latest invariant report.
 * "Run now" triggers a fresh check via POST.
 * No fixing, no resolving — that is deliberate.
 */

"use client";

import { useState, useTransition } from "react";
import type { InvariantReport } from "@/lib/invariants/types";
import { invariantLabel } from "@/lib/invariants/types";

interface Props {
  initial: InvariantReport;
}

export function InvariantsPanel({ initial }: Props) {
  const [report, setReport] = useState<InvariantReport>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const total = report.summary?.total ?? 0;
  const healthy = total === 0;

  function runNow() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/super/invariants", { method: "POST" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const next = (await res.json()) as InvariantReport;
        setReport(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header / status */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Invariant report</h2>
          <p className="text-sm text-muted-foreground">
            {report.summary
              ? `Last run: ${new Date(report.summary.ran_at).toLocaleString()}`
              : "No runs recorded yet."}
          </p>
        </div>
        <button
          type="button"
          onClick={runNow}
          disabled={pending}
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {pending ? "Running…" : "Run now"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Total" value={total} tone={healthy ? "green" : "red"} />
        <Card
          label="Money"
          value={report.summary?.money ?? 0}
          tone={(report.summary?.money ?? 0) === 0 ? "green" : "red"}
        />
        <Card
          label="Identity"
          value={report.summary?.identity ?? 0}
          tone={(report.summary?.identity ?? 0) === 0 ? "green" : "red"}
        />
        <Card
          label="Operational"
          value={report.summary?.operational ?? 0}
          tone={(report.summary?.operational ?? 0) === 0 ? "green" : "red"}
        />
      </div>

      {/* Grouped violations */}
      {report.grouped.length === 0 ? (
        <div className="rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          No violations. All invariants hold.
        </div>
      ) : (
        <div className="space-y-3">
          {report.grouped.map((g) => (
            <div key={g.invariant} className="rounded-md border">
              <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
                <div>
                  <p className="text-sm font-medium">
                    {invariantLabel(g.invariant)}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {g.invariant}
                  </p>
                </div>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                  {g.count}
                </span>
              </div>
              <ul className="divide-y">
                {g.examples.map((v) => (
                  <li key={v.id} className="px-4 py-2 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">
                      {v.entity_type}:{v.entity_id}
                    </span>
                    <pre className="mt-1 overflow-x-auto text-xs text-muted-foreground">
                      {JSON.stringify(v.detail, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "red";
}) {
  const toneCls =
    tone === "green"
      ? "border-green-300 bg-green-50 text-green-800"
      : "border-red-300 bg-red-50 text-red-800";
  return (
    <div className={`rounded-md border p-3 ${toneCls}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
