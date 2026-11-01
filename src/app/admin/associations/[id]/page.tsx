/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Plus,
  RefreshCw,
  Users,
  Search,
  Check,
} from "lucide-react";
import type { Association } from "@/lib/domain/associations";
import {
  associationStatusLabel,
  MEMBERSHIP_ROLES,
  type MembershipStatus,
} from "@/lib/domain/associations";

type MembershipRow = {
  id: string;
  memberEntityType: "operator" | "driver";
  memberEntityId: string;
  memberDisplayName: string | null;
  role: string;
  status: MembershipStatus;
  joinedAt?: string | null;
  notes?: string | null;
};

type PickerItem = {
  id: string;
  label: string;
  sublabel?: string;
};

export default function AssociationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [association, setAssociation] = useState<Association | null>(null);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/associations/${id}/memberships`, {
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (body as { error?: string }).error ?? `Failed (${res.status})`
        );
      }
      setAssociation((body as { association: Association }).association);
      setMemberships(
        ((body as { memberships: MembershipRow[] }).memberships ??
          []) as MembershipRow[]
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const setStatus = async (membershipId: string, status: MembershipStatus) => {
    const res = await fetch(`/api/admin/associations/${id}/memberships`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId, status }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast((body as { error?: string }).error ?? "Update failed");
      return;
    }
    showToast(`Status → ${status}`);
    await load();
  };

  if (loading && !association) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error && !association) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/admin/associations")}
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push("/admin/associations")}
            className="p-2 rounded-xl bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-black text-white truncate">
              {association?.name}
            </h1>
            <p className="text-[11px] text-zinc-500">
              {association?.regionCode} ·{" "}
              {association ? associationStatusLabel(association.status) : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="px-3 py-2 rounded-xl bg-white/[0.06] text-zinc-300 text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Member
          </button>
        </div>
      </div>

      {toast && (
        <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-200 rounded-xl px-4 py-3 text-xs font-bold">
          {toast}
        </div>
      )}

      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <Users className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-bold text-zinc-300">
            Memberships ({memberships.length})
          </span>
        </div>

        {memberships.length === 0 ? (
          <div className="p-10 text-center text-xs text-zinc-500">
            No members yet. Add an operator or driver.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-zinc-500 border-b border-white/[0.06]">
                  <th className="px-4 py-2.5 font-bold">Member</th>
                  <th className="px-4 py-2.5 font-bold">Type</th>
                  <th className="px-4 py-2.5 font-bold">Role</th>
                  <th className="px-4 py-2.5 font-bold">Status</th>
                  <th className="px-4 py-2.5 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">
                        {m.memberDisplayName ?? m.memberEntityId}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 truncate max-w-[12rem]">
                        {m.memberEntityId}
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-zinc-400">
                      {m.memberEntityType}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{m.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          m.status === "Active"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : m.status === "Suspended"
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-zinc-500/15 text-zinc-400"
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.status !== "Active" && (
                          <button
                            type="button"
                            onClick={() => void setStatus(m.id, "Active")}
                            className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-[10px] font-bold"
                          >
                            Activate
                          </button>
                        )}
                        {m.status === "Active" && (
                          <button
                            type="button"
                            onClick={() => void setStatus(m.id, "Suspended")}
                            className="px-2 py-1 rounded-lg bg-amber-500/15 text-amber-400 text-[10px] font-bold"
                          >
                            Suspend
                          </button>
                        )}
                        {m.status !== "Resigned" && (
                          <button
                            type="button"
                            onClick={() => void setStatus(m.id, "Resigned")}
                            className="px-2 py-1 rounded-lg bg-zinc-500/15 text-zinc-400 text-[10px] font-bold"
                          >
                            Resign
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddMemberModal
          associationId={id}
          existingMemberIds={new Set(
            memberships
              .filter((m) => m.status === "Active")
              .map((m) => `${m.memberEntityType}:${m.memberEntityId}`)
          )}
          onClose={() => setShowAdd(false)}
          onSuccess={async () => {
            setShowAdd(false);
            showToast("Member added");
            await load();
          }}
        />
      )}
    </div>
  );
}

function AddMemberModal({
  associationId,
  existingMemberIds,
  onClose,
  onSuccess,
}: {
  associationId: string;
  existingMemberIds: Set<string>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [memberEntityType, setMemberEntityType] = useState<
    "operator" | "driver"
  >("operator");
  const [selected, setSelected] = useState<PickerItem | null>(null);
  const [role, setRole] = useState<(typeof MEMBERSHIP_ROLES)[number]>("Member");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PickerItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCandidates = useCallback(async (type: "operator" | "driver") => {
    setListLoading(true);
    setListError(null);
    setSelected(null);
    setQuery("");
    try {
      const url = type === "operator" ? "/api/operators" : "/api/drivers";
      const res = await fetch(url, { credentials: "include", cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (body as { error?: string }).error ?? `Failed to load ${type}s`
        );
      }
      if (type === "operator") {
        const ops = (body as { operators?: Array<Record<string, unknown>> })
          .operators ?? [];
        setItems(
          ops.map((o) => ({
            id: o.id as string,
            label:
              (o.companyName as string) ||
              (o.name as string) ||
              (o.id as string),
            sublabel: [o.name as string, o.phone as string]
              .filter(Boolean)
              .join(" · "),
          }))
        );
      } else {
        const drvs = (body as { drivers?: Array<Record<string, unknown>> })
          .drivers ?? [];
        setItems(
          drvs.map((d) => ({
            id: d.id as string,
            label: (d.fullName as string) || (d.id as string),
            sublabel: [d.phone as string, d.assignedVehicleReg as string]
              .filter(Boolean)
              .join(" · "),
          }))
        );
      }
    } catch (err) {
      setItems([]);
      setListError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCandidates(memberEntityType);
  }, [memberEntityType, loadCandidates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((it) => {
        const key = `${memberEntityType}:${it.id}`;
        if (existingMemberIds.has(key)) return false;
        if (!q) return true;
        return (
          it.label.toLowerCase().includes(q) ||
          (it.sublabel ?? "").toLowerCase().includes(q) ||
          it.id.toLowerCase().includes(q)
        );
      })
      .slice(0, 40);
  }, [items, query, memberEntityType, existingMemberIds]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setError("Select an operator or driver from the list");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch(
      `/api/admin/associations/${associationId}/memberships`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberEntityType,
          memberEntityId: selected.id,
          role,
        }),
      }
    );
    const body = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError((body as { error?: string }).error ?? "Failed to add member");
      return;
    }
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-sm font-black uppercase text-white">Add Member</h2>
        {error && (
          <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-3 text-xs">
            {error}
          </div>
        )}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
              Type
            </label>
            <select
              value={memberEntityType}
              onChange={(e) =>
                setMemberEntityType(e.target.value as "operator" | "driver")
              }
              className="input w-full"
            >
              <option value="operator">Operator</option>
              <option value="driver">Driver</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
              Search {memberEntityType === "operator" ? "operators" : "drivers"}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, phone, or id…"
                className="input w-full pl-9"
              />
            </div>
          </div>

          <div className="border border-white/[0.06] rounded-xl max-h-48 overflow-y-auto">
            {listLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              </div>
            ) : listError ? (
              <div className="p-3 text-xs text-red-300">{listError}</div>
            ) : filtered.length === 0 ? (
              <div className="p-3 text-xs text-zinc-500">
                No matching {memberEntityType}s
                {existingMemberIds.size > 0
                  ? " (active members are hidden)"
                  : ""}
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {filtered.map((it) => {
                  const active = selected?.id === it.id;
                  return (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(it)}
                        className={`w-full text-left px-3 py-2.5 flex items-start gap-2 hover:bg-white/[0.04] ${
                          active ? "bg-emerald-500/10" : ""
                        }`}
                      >
                        <span
                          className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            active
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                              : "border-white/20"
                          }`}
                        >
                          {active && <Check className="w-2.5 h-2.5" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-white truncate">
                            {it.label}
                          </span>
                          {it.sublabel && (
                            <span className="block text-[10px] text-zinc-500 truncate">
                              {it.sublabel}
                            </span>
                          )}
                          <span className="block text-[10px] font-mono text-zinc-600 truncate">
                            {it.id}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {selected && (
            <div className="text-[11px] text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
              Selected: <span className="font-bold">{selected.label}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as (typeof MEMBERSHIP_ROLES)[number])
              }
              className="input w-full"
            >
              {MEMBERSHIP_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white/[0.06] text-zinc-300 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selected}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
