"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { RouteRow } from "@/lib/admin/routes";

interface Props {
  route?: RouteRow;
  onClose: () => void;
  onSaved: () => void;
}

const REGIONS = ["Hhohho", "Manzini", "Lubombo", "Shiselweni"];

export default function RouteFormModal({ route, onClose, onSaved }: Props) {
  const [origin, setOrigin] = useState(route?.origin ?? "");
  const [destination, setDestination] = useState(route?.destination ?? "");
  const [region, setRegion] = useState(route?.region ?? REGIONS[0]);
  const [distanceKm, setDistanceKm] = useState(route?.distanceKm ?? 40);
  const [baseFareE, setBaseFareE] = useState(route?.baseFareE ?? 50);
  const [startTime, setStartTime] = useState(route?.startTime ?? "05:00");
  const [defaultBay, setDefaultBay] = useState(route?.defaultBay ?? "Bay 01");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const body = { origin, destination, region, distanceKm, baseFareE, startTime, defaultBay };
    const url = route ? `/api/admin/routes/${route.id}` : "/api/admin/routes";
    const method = route ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) onSaved();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-start justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white">
            {route ? "Edit Route" : "Add Route"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Origin *">
              <input
                required
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white"
              />
            </Field>
            <Field label="Destination *">
              <input
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white"
              />
            </Field>
          </div>
          <Field label="Region *">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white"
            >
              {REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Distance (km)">
              <input
                type="number"
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-900 dark:text-white"
              />
            </Field>
            <Field label="Fare (E)">
              <input
                type="number"
                value={baseFareE}
                onChange={(e) => setBaseFareE(Number(e.target.value))}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-900 dark:text-white"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Time">
              <input
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-900 dark:text-white"
              />
            </Field>
            <Field label="Default Bay">
              <input
                value={defaultBay}
                onChange={(e) => setDefaultBay(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-900 dark:text-white"
              />
            </Field>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
