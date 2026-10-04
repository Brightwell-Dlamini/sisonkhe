"use client";

import { useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import type { MarshalRow } from "@/lib/admin/marshals";

interface Props {
  mode: "create" | "edit";
  marshal?: MarshalRow;
  onClose: () => void;
  onSaved: () => void;
}

const REGIONS = ["Hhohho", "Manzini", "Lubombo", "Shiselweni"];

export default function MarshalFormModal({
  mode,
  marshal,
  onClose,
  onSaved,
}: Props) {
  const [firstName, setFirstName] = useState(marshal?.firstName ?? "");
  const [surname, setSurname] = useState(marshal?.surname ?? "");
  const [phone, setPhone] = useState(marshal?.phone ?? "");
  const [cellNo, setCellNo] = useState(marshal?.cellNo ?? "");
  const [idNumber, setIdNumber] = useState(marshal?.idNumber ?? "");
  const [region, setRegion] = useState(marshal?.region ?? REGIONS[0]);
  const [terminalName, setTerminalName] = useState(marshal?.terminalName ?? "");
  const [routeId, setRouteId] = useState(marshal?.assignedRouteId ?? "");
  const [badgeNumber, setBadgeNumber] = useState(marshal?.badgeNumber ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const body = {
      firstName,
      surname,
      phone,
      cellNo,
      idNumber,
      region,
      terminalName,
      assignedRouteId: routeId || null,
      badgeNumber,
    };

    try {
      const url =
        mode === "edit" && marshal
          ? `/api/admin/marshals/${marshal.id}`
          : "/api/admin/marshals";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
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

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-white/[0.06]">
          <h3 className="text-sm font-black uppercase tracking-wide text-white">
            {mode === "edit" ? "Edit Marshal" : "Register Marshal"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200">
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name *">
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Surname *">
              <input
                type="text"
                required
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone *">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+268 7600 0000"
                className="input font-mono"
              />
            </Field>
            <Field label="Cell No">
              <input
                type="tel"
                value={cellNo}
                onChange={(e) => setCellNo(e.target.value)}
                placeholder="78653001"
                className="input font-mono"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="National ID">
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="13 digits"
                className="input font-mono"
              />
            </Field>
            <Field label="Badge #">
              <input
                type="text"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                placeholder="MSH-014"
                className="input font-mono"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Region *">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="input"
              >
                {REGIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Terminal">
              <input
                type="text"
                value={terminalName}
                onChange={(e) => setTerminalName(e.target.value)}
                placeholder="Mbabane Bus Terminus"
                className="input"
              />
            </Field>
          </div>

          <Field label="Assigned Route ID (optional)">
            <input
              type="text"
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              placeholder="e.g. h_mb_mz"
              className="input font-mono"
            />
          </Field>

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
              {mode === "edit" ? "Save Changes" : "Register Marshal"}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
