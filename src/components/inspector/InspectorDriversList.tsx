"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, UserCircle } from "lucide-react";
import { Badge, PageHeader } from "@/components/ui";

interface Driver {
  id: string;
  fullName: string;
  phone: string;
  nationalId: string | null;
  licenseNumber: string | null;
  pdpNumber: string | null;
  pdpExpiryDate: string | null;
  pdpStatus: string | null;
  assignedVehicleReg: string | null;
  status: string;
  region: string | null;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

function pdpTone(status: string | null, expiry: string | null): "success" | "warning" | "danger" | "default" {
  const d = daysUntil(expiry);
  if (d !== null && d < 0) return "danger";
  if (d !== null && d <= 30) return "warning";
  if (status && /active|valid/i.test(status)) return "success";
  return "default";
}

export default function InspectorDriversList() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/drivers", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setDrivers(data.drivers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load drivers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toUpperCase();
    if (!needle) return drivers;
    return drivers.filter((d) => {
      const hay = [
        d.fullName,
        d.phone,
        d.nationalId,
        d.licenseNumber,
        d.pdpNumber,
        d.assignedVehicleReg,
        d.status,
        d.region,
      ]
        .filter(Boolean)
        .join(" ")
        .toUpperCase();
      return hay.includes(needle);
    });
  }, [drivers, q]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="All Drivers"
        description="Full driver registry — read only. PDP and assignment status for roadside checks."
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, phone, ID, plate…"
          className="w-full bg-[#0F0F10] border border-white/[0.08] rounded-xl pl-10 pr-3 py-2.5 text-sm text-white"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-zinc-400 text-sm py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading drivers…
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
            {filtered.length} driver{filtered.length === 1 ? "" : "s"}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-wide text-zinc-500 border-b border-white/[0.06]">
                <tr>
                  <th className="px-4 py-2 font-semibold">Name</th>
                  <th className="px-4 py-2 font-semibold">Phone</th>
                  <th className="px-4 py-2 font-semibold">Vehicle</th>
                  <th className="px-4 py-2 font-semibold">PDP</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    className="border-t border-white/[0.04] hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-white">{d.fullName}</div>
                      {d.nationalId && (
                        <div className="text-[10px] text-zinc-500 font-mono">{d.nationalId}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-300 font-mono text-xs">{d.phone}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">
                      {d.assignedVehicleReg ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={pdpTone(d.pdpStatus, d.pdpExpiryDate)} size="sm">
                        {d.pdpStatus ?? (d.pdpExpiryDate ? "Dated" : "—")}
                      </Badge>
                      {d.pdpExpiryDate && (
                        <span className="ml-2 text-[10px] text-zinc-500">
                          exp {d.pdpExpiryDate}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-400">{d.status}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-zinc-500 text-xs">
                      <UserCircle className="w-5 h-5 mx-auto mb-2 opacity-40" />
                      No drivers match.
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
