"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Edit2, Megaphone } from "lucide-react";
import type { Advert } from "@/types";
import AdvertFormModal from "./AdvertFormModal";

export default function AdvertsManager() {
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Advert | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/super/adverts");
    if (res.ok) setAdverts((await res.json()).adverts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const del = async (id: string) => {
    if (!confirm("Delete this advert?")) return;
    await fetch(`/api/super/adverts/${id}`, { method: "DELETE" });
    void load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-600" />
            Advertisements
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Manage sponsored broadcasts shown on kiosk displays.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-xs font-black uppercase flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New Advert
        </button>
      </header>

      {adverts.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
          <Megaphone className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
          <div className="text-sm font-bold">No adverts yet</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adverts.map((a) => (
            <div
              key={a.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden"
            >
              <img
                src={a.imageUrl}
                alt={a.title}
                className="w-full h-32 object-cover"
              />
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-600">
                    {a.sponsorName}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      a.isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {a.isActive ? "Active" : "Paused"}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-2">
                  {a.title}
                </h3>
                <div className="flex gap-1.5 pt-2">
                  <button
                    onClick={() => {
                      setEditing(a);
                      setShowForm(true);
                    }}
                    className="flex-1 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => del(a.id)}
                    className="py-1.5 px-2 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-lg text-[10px] font-bold"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AdvertFormModal
          advert={editing ?? undefined}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={() => {
            void load();
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
