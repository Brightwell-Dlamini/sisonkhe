"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import type { MarshalRow } from "@/lib/admin/marshals";

interface Props {
  mode: "create" | "edit";
  marshal?: MarshalRow;
  onClose: () => void;
  onSaved: () => void;
}

const REGIONS = ["Hhohho", "Manzini", "Lubombo", "Shiselweni"];

type RouteOpt = {
  id: string;
  origin: string;
  destination: string;
  region: string;
};

type TerminalOpt = {
  id: string;
  name: string;
  region: string;
};

export default function MarshalFormModal({
  mode,
  marshal,
  onClose,
  onSaved,
}: Props) {
  const [region, setRegion] = useState(marshal?.region ?? REGIONS[0]);
  const [terminalId, setTerminalId] = useState(marshal?.terminalId ?? "");
  const [terminalName, setTerminalName] = useState(marshal?.terminalName ?? "");
  const [routeId, setRouteId] = useState(marshal?.assignedRouteId ?? "");
  const [isActive, setIsActive] = useState(marshal?.isActive ?? true);
  const [routes, setRoutes] = useState<RouteOpt[]>([]);
  const [terminals, setTerminals] = useState<TerminalOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [rRes, tRes] = await Promise.all([
          fetch("/api/admin/routes", { cache: "no-store" }),
          fetch("/api/admin/terminals", { cache: "no-store" }),
        ]);
        const rData = await rRes.json().catch(() => ({}));
        const tData = await tRes.json().catch(() => ({}));
        setRoutes(
          (rData.routes ?? []).map(
            (r: {
              id: string;
              origin: string;
              destination: string;
              region: string;
            }) => ({
              id: r.id,
              origin: r.origin,
              destination: r.destination,
              region: r.region,
            })
          )
        );
        // Prefer dedicated terminals list if present; fall back to region configs
        const termList: TerminalOpt[] =
          (tData.terminalRecords as TerminalOpt[] | undefined) ??
          (tData.terminals ?? []).map(
            (t: { region: string; terminalName: string }) => ({
              id: t.region,
              name: t.terminalName,
              region: t.region,
            })
          );
        setTerminals(termList);
      } catch {
        setRoutes([]);
        setTerminals([]);
      }
    })();
  }, []);

  const routesInRegion = useMemo(
    () => routes.filter((r) => r.region === region || r.region === region),
    [routes, region]
  );

  const terminalsInRegion = useMemo(
    () => terminals.filter((t) => t.region === region),
    [terminals, region]
  );

  useEffect(() => {
    // Clear route if it no longer belongs to selected region
    if (routeId && !routesInRegion.some((r) => r.id === routeId)) {
      setRouteId("");
    }
  }, [region, routesInRegion, routeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode !== "edit" || !marshal) return;
    setLoading(true);
    setError(null);

    const selectedTerminal = terminalsInRegion.find((t) => t.id === terminalId);

    const body = {
      region,
      terminalId: terminalId || null,
      terminalName: selectedTerminal?.name || terminalName || null,
      assignedRouteId: routeId || null,
      isActive,
    };

    try {
      const res = await fetch(`/api/admin/marshals/${marshal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  // Create mode is retired — identity comes from field portal
  if (mode === "create") {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl max-w-md w-full p-6 space-y-3">
          <h3 className="text-sm font-black uppercase text-white">
            Marshals enrol in the field
          </h3>
          <p className="text-xs text-zinc-400">
            Identity is collected on the marshal portal / claim flow. Use Issue
            login on the list, then Edit to assign region, terminal, and route.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-white">
              Assign rank post
            </h3>
            <p className="text-[11px] text-zinc-500 mt-1">
              {marshal?.fullName} — link region, terminal, and corridor. No raw
              database IDs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-xs text-zinc-300">
            <div className="font-bold text-white">{marshal?.fullName}</div>
            <div className="font-mono text-[11px] text-zinc-500 mt-0.5">
              {marshal?.cellNo ?? marshal?.phone ?? "—"}
              {marshal?.idNumber ? ` · ID ${marshal.idNumber}` : ""}
            </div>
          </div>

          <Field label="Region *">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="input"
              required
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Terminal">
            <select
              value={terminalId}
              onChange={(e) => {
                setTerminalId(e.target.value);
                const t = terminalsInRegion.find((x) => x.id === e.target.value);
                if (t) setTerminalName(t.name);
              }}
              className="input"
            >
              <option value="">— Select terminal —</option>
              {terminalsInRegion.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {terminalsInRegion.length === 0 && (
              <p className="text-[10px] text-zinc-500 mt-1">
                No terminals for this region yet. Add them under Admin →
                Terminals.
              </p>
            )}
          </Field>

          <Field label="Corridor / Route">
            <select
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              className="input"
            >
              <option value="">— No fixed route —</option>
              {routesInRegion.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.origin} to {r.destination}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-zinc-500 mt-1">
              Shown as origin to destination — never as an internal ID.
            </p>
          </Field>

          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            Active on rank
          </label>

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
              disabled={loading}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save assignment
            </button>
          </div>
        </form>

        <style jsx>{`
          .input {
            width: 100%;
            background-color: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 0.75rem;
            padding: 0.625rem 0.875rem;
            font-size: 0.875rem;
            color: white;
            outline: none;
          }
          .input:focus {
            border-color: rgb(16 185 129);
          }
        `}</style>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
