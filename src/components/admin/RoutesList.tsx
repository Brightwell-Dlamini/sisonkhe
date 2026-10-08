"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Loader2, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui";
import type { RouteRow } from "@/lib/admin/routes";
import RouteFormModal from "./RouteFormModal";

function routeLabel(origin: string, destination: string) {
  return `${origin} to ${destination}`;
}

export default function RoutesList() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RouteRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const uiToast = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/routes", { cache: "no-store" });
      const data = await res.json();
      setRoutes(data.routes ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = routes.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.origin.toLowerCase().includes(q) ||
      r.destination.toLowerCase().includes(q) ||
      r.region.toLowerCase().includes(q)
    );
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = async (route: RouteRow) => {
    if (
      !confirm(
        `Delete corridor ${routeLabel(route.origin, route.destination)}?`
      )
    )
      return;
    const res = await fetch(`/api/admin/routes/${route.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      uiToast.error("Delete failed", data.error ?? "The corridor could not be removed.");
      return;
    }
    showToast("Route deleted");
    void refresh();
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">
            Corridors & Routes
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            National transport corridors and fares.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Route
        </button>
      </header>

      {toast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl px-4 py-3 text-xs font-bold">
          {toast}
        </div>
      )}

      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search routes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2 text-xs text-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-white/[0.02]">
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Corridor</th>
                <th className="px-4 py-3 text-right">Distance</th>
                <th className="px-4 py-3 text-right">Fare</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/[0.06] hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 text-zinc-300">{r.region}</td>
                  <td className="px-4 py-3 font-bold text-white">
                    {routeLabel(r.origin, r.destination)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-400">
                    {r.distanceKm} km
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                    E{r.baseFareE.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-500 text-[11px]">
                    {r.startTime ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setEditing(r);
                          setShowForm(true);
                        }}
                        className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-zinc-300"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <RouteFormModal
          route={editing ?? undefined}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={() => {
            showToast(editing ? "Route updated" : "Route added");
            void refresh();
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
