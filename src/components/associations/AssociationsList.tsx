/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Associations list + create surface (Phase 0).
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  MapPin,
  Phone,
  User,
  Plus,
} from "lucide-react";
import type { Association } from "@/lib/domain/associations";
import { associationStatusLabel } from "@/lib/domain/associations";
import type { CreateAssociationInput } from "@/lib/associations/mutations";
import AssociationFormModal from "./AssociationFormModal";

type AssociationRow = Association & {
  membershipCount?: number;
};

export default function AssociationsList() {
  const [rows, setRows] = useState<AssociationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [regionScope, setRegionScope] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/associations", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ??
            `Failed to load associations (${res.status})`
        );
      }
      const data = (await res.json()) as {
        associations?: AssociationRow[];
        regionScope?: string | null;
      };
      setRows(data.associations ?? []);
      setRegionScope(data.regionScope ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load associations");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreate = async (input: CreateAssociationInput) => {
    const res = await fetch("/api/admin/associations", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false as const,
        error: (body as { error?: string }).error ?? "Create failed",
        issues: (body as { details?: Record<string, string[]> }).details,
      };
    }
    setShowCreate(false);
    showToast(`Registered ${(body as { association?: Association }).association?.name ?? "association"}`);
    await load();
    return { success: true as const };
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.shortName ?? "").toLowerCase().includes(q) ||
        (a.registrationNumber ?? "").toLowerCase().includes(q) ||
        (a.chairName ?? "").toLowerCase().includes(q) ||
        a.regionCode.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name, registration, chair, or region…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-white/[0.06] text-zinc-300 text-xs font-bold hover:bg-white/[0.08] disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Register Association
          </button>
        </div>
      </div>

      {toast && (
        <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-200 rounded-xl px-4 py-3 text-xs font-bold">
          {toast}
        </div>
      )}

      {error && (
        <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-12 text-center">
          <Building2 className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-zinc-400">No associations found</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Register the first association for this region. Ensure migration
            20261101_associations has been applied.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3 hover:border-white/[0.1] transition-colors"
            >
              <div className="min-w-0">
                <div className="font-black text-white text-sm truncate">{a.name}</div>
                {a.shortName && (
                  <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider truncate">
                    {a.shortName}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-[11px] text-zinc-400">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="font-mono">{a.regionCode}</span>
                </div>
                {a.chairName && (
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 shrink-0" />
                    <span className="truncate">{a.chairName}</span>
                  </div>
                )}
                {a.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span className="font-mono">{a.contactPhone}</span>
                  </div>
                )}
                {typeof a.membershipCount === "number" && (
                  <div className="text-[10px] text-zinc-500">
                    Members: {a.membershipCount}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    a.status === "Active"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : a.status === "Suspended"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-zinc-500/15 text-zinc-400"
                  }`}
                >
                  {associationStatusLabel(a.status)}
                </span>
                {a.registrationNumber && (
                  <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[8rem]">
                    {a.registrationNumber}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <AssociationFormModal
          defaultRegionCode={regionScope}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
