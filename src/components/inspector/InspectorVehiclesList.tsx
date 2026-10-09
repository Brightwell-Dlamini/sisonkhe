"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Car } from "lucide-react";
import { Badge, PageHeader } from "@/components/ui";

interface Vehicle {
  registrationNumber: string;
  vic: string | null;
  make: string;
  model: string;
  status: string;
  ownerName: string | null;
  driverName: string | null;
  permitNumber: string | null;
  permitStatus: string | null;
  permitExpiryDate: string | null;
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
  if (status && /expir|suspend|invalid/i.test(status)) return "danger";
  return "default";
}

export default function InspectorVehiclesList() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

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
      setError(e instanceof Error ? e.message : "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toUpperCase();
    if (!needle) return vehicles;
    return vehicles.filter((v) => {
      const hay = [
        v.registrationNumber,
        v.vic,
        v.make,
        v.model,
        v.ownerName,
        v.driverName,
        v.permitNumber,
        v.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toUpperCase();
      return hay.includes(needle);
    });
  }, [vehicles, q]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="All Vehicles"
        description="Full fleet registry — read only. Tap a row to open roadside lookup."
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search plate, VIC, owner, driver…"
          className="w-full bg-[#0F0F10] border border-white/[0.08] rounded-xl pl-10 pr-3 py-2.5 text-sm text-white"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-zinc-400 text-sm py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading vehicles…
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
            {filtered.length} vehicle{filtered.length === 1 ? "" : "s"}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-wide text-zinc-500 border-b border-white/[0.06]">
                <tr>
                  <th className="px-4 py-2 font-semibold">Plate</th>
                  <th className="px-4 py-2 font-semibold">VIC</th>
                  <th className="px-4 py-2 font-semibold">Vehicle</th>
                  <th className="px-4 py-2 font-semibold">Driver</th>
                  <th className="px-4 py-2 font-semibold">Permit</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
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
                    <td className="px-4 py-2.5 font-mono text-zinc-400 text-xs">
                      {v.vic ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-300">
                      {v.make} {v.model}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400">
                      {v.driverName ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={permitTone(v.permitStatus, v.permitExpiryDate)} size="sm">
                        {v.permitStatus ?? "—"}
                      </Badge>
                      {v.permitExpiryDate && (
                        <span className="ml-2 text-[10px] text-zinc-500">
                          exp {v.permitExpiryDate}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400 text-xs">{v.status}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-zinc-500 text-xs">
                      <Car className="w-5 h-5 mx-auto mb-2 opacity-40" />
                      No vehicles match.
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
