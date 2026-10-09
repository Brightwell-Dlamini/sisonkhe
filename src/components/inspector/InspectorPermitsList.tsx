"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Award } from "lucide-react";
import { Badge, PageHeader } from "@/components/ui";

interface Vehicle {
  registrationNumber: string;
  vic: string | null;
  ownerName: string | null;
  driverName: string | null;
  permitNumber: string | null;
  permitStatus: string | null;
  permitIssueDate: string | null;
  permitExpiryDate: string | null;
  cofNumber: string | null;
  cofExpiryDate: string | null;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

function permitTone(status: string | null, expiry: string | null): "success" | "warning" | "danger" | "default" {
  const d = daysUntil(expiry);
  if (d !== null && d < 0) return "danger";
  if (d !== null && d <= 30) return "warning";
  if (status && /active/i.test(status)) return "success";
  if (status && /expir|suspend|invalid|pending/i.test(status)) return "warning";
  return "default";
}

type Filter = "all" | "expired" | "expiring" | "active";

export default function InspectorPermitsList() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vehicles", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setVehicles(data.vehicles ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load permits");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let rows = vehicles;
    if (filter === "expired") {
      rows = rows.filter((v) => {
        const d = daysUntil(v.permitExpiryDate);
        return d !== null && d < 0;
      });
    } else if (filter === "expiring") {
      rows = rows.filter((v) => {
        const d = daysUntil(v.permitExpiryDate);
        return d !== null && d >= 0 && d <= 30;
      });
    } else if (filter === "active") {
      rows = rows.filter((v) => {
        const d = daysUntil(v.permitExpiryDate);
        return (
          (v.permitStatus && /active/i.test(v.permitStatus)) ||
          (d !== null && d > 30)
        );
      });
    }

    const needle = q.trim().toUpperCase();
    if (!needle) return rows;
    return rows.filter((v) => {
      const hay = [
        v.registrationNumber,
        v.vic,
        v.ownerName,
        v.driverName,
        v.permitNumber,
        v.permitStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toUpperCase();
      return hay.includes(needle);
    });
  }, [vehicles, q, filter]);

  const counts = useMemo(() => {
    let expired = 0;
    let expiring = 0;
    for (const v of vehicles) {
      const d = daysUntil(v.permitExpiryDate);
      if (d !== null && d < 0) expired += 1;
      else if (d !== null && d <= 30) expiring += 1;
    }
    return { expired, expiring, total: vehicles.length };
  }, [vehicles]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="All Permits"
        description="Permit status across the fleet — read only. Tap a row for roadside lookup."
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", `All (${counts.total})`],
            ["expired", `Expired (${counts.expired})`],
            ["expiring", `≤30 days (${counts.expiring})`],
            ["active", "Active"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              filter === key
                ? "bg-white/[0.08] border-zinc-400 text-white"
                : "border-white/[0.06] text-zinc-400 hover:border-zinc-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search plate, permit #, owner…"
          className="w-full bg-[#0F0F10] border border-white/[0.08] rounded-xl pl-10 pr-3 py-2.5 text-sm text-white"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-zinc-400 text-sm py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading permits…
        </div>
      )}

      {error && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-[#0F0F10] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-white/[0.06] text-[11px] text-zinc-500">
            {filtered.length} record{filtered.length === 1 ? "" : "s"}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-wide text-zinc-500 border-b border-white/[0.06]">
                <tr>
                  <th className="px-4 py-2 font-semibold">Plate</th>
                  <th className="px-4 py-2 font-semibold">Permit #</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold">Issued</th>
                  <th className="px-4 py-2 font-semibold">Expires</th>
                  <th className="px-4 py-2 font-semibold">Owner / driver</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => {
                  const d = daysUntil(v.permitExpiryDate);
                  return (
                    <tr
                      key={v.registrationNumber}
                      onClick={() =>
                        router.push(
                          `/inspector/scan?q=${encodeURIComponent(v.registrationNumber)}`
                        )
                      }
                      className="border-t border-white/[0.04] hover:bg-white/[0.03] cursor-pointer"
                    >
                      <td className="px-4 py-2.5 font-mono font-semibold text-white">
                        {v.registrationNumber}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">
                        {v.permitNumber ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={permitTone(v.permitStatus, v.permitExpiryDate)} size="sm">
                          {v.permitStatus ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-500">
                        {v.permitIssueDate ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className="text-zinc-300">{v.permitExpiryDate ?? "—"}</span>
                        {d !== null && (
                          <span
                            className={`ml-2 ${
                              d < 0
                                ? "text-red-400"
                                : d <= 30
                                  ? "text-amber-400"
                                  : "text-zinc-600"
                            }`}
                          >
                            {d < 0 ? `${Math.abs(d)}d overdue` : `${d}d`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-400">
                        <div>{v.ownerName ?? "—"}</div>
                        {v.driverName && (
                          <div className="text-zinc-600">{v.driverName}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-zinc-500 text-xs">
                      <Award className="w-5 h-5 mx-auto mb-2 opacity-40" />
                      No permits match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
