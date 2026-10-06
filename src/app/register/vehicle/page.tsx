/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vehicle public registration — asset data only.
 * No driver link. Staff assign driver/route/operator later.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Car,
  FileText,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BadgeCheck,
  Bus,
} from "lucide-react";

type FieldErrors = Record<string, string[] | undefined>;

const emptyForm = {
  registrationNumber: "",
  make: "",
  model: "",
  seatingCapacity: "15",
  classification: "kombi",
  ownerName: "",
  ownerPhone: "",
  loadingBay: "",
  permitNumber: "",
  permitIssueDate: "",
  permitExpiryDate: "",
  cofNumber: "",
  cofIssueDate: "",
  cofExpiryDate: "",
  association: "",
  insuranceExpiry: "",
  roadworthinessExpiry: "",
};

const CLASSES = [
  { value: "kombi", label: "Kombi", hint: "Up to ~16 seats" },
  { value: "midbus", label: "Midbus", hint: "Medium capacity" },
  { value: "bus", label: "Bus", hint: "Full coach" },
] as const;

const inputBase =
  "w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/80 focus:border-amber-500 transition";
const inputOk = `${inputBase} border-slate-300 hover:border-slate-400`;
const inputErr = `${inputBase} border-red-400 ring-1 ring-red-300`;

export default function RegisterVehiclePage() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState<{
    registrationNumber: string;
    vic: string;
  } | null>(null);

  function update(key: keyof typeof emptyForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await fetch("/api/register/vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, seatingCapacity: Number(form.seatingCapacity) }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.issues) setFieldErrors(data.issues as FieldErrors);
        setError(data.error ?? "Registration failed");
        setLoading(false);
        return;
      }
      setSuccess({
        registrationNumber: data.registrationNumber,
        vic: data.vic,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden">
        <div className="bg-slate-900 text-white p-6 sm:p-8 border-b-4 border-emerald-500 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center mb-4">
            <BadgeCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-emerald-400">
            Vehicle recorded
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            No driver was linked. Staff will assign driver, route, and operator.
          </p>
        </div>
        <div className="p-6 sm:p-8 space-y-3">
          <p className="font-mono text-xl font-black text-slate-900">{success.registrationNumber}</p>
          <p className="text-sm text-slate-600">VIC <span className="font-mono font-bold">{success.vic}</span></p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950">
        <span className="font-bold">Asset registration only.</span>{" "}
        This form does not assign a driver. Authorised staff link drivers in admin.
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden">
        <div className="bg-slate-900 text-white p-5 sm:p-7 border-b-4 border-amber-500">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bus className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-amber-400">
                Vehicle registration
              </h1>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                Fleet data collection · No auto-linking
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-8 space-y-8">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <section className="space-y-5 pb-6 border-b border-slate-200">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-amber-600" />
              <span>01 · Vehicle identity</span>
            </h2>
            <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 sm:p-5 space-y-4">
              <Field label="Registration number" required error={fieldErrors.registrationNumber?.[0]}>
                <input required value={form.registrationNumber}
                  onChange={(e) => update("registrationNumber", e.target.value.toUpperCase())}
                  className={`${fieldErrors.registrationNumber ? inputErr : inputOk} font-mono tracking-wide`}
                  placeholder="HSD 123 BM" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Make" required error={fieldErrors.make?.[0]}>
                  <input required value={form.make} onChange={(e) => update("make", e.target.value)}
                    className={fieldErrors.make ? inputErr : inputOk} placeholder="Toyota" />
                </Field>
                <Field label="Model" required error={fieldErrors.model?.[0]}>
                  <input required value={form.model} onChange={(e) => update("model", e.target.value)}
                    className={fieldErrors.model ? inputErr : inputOk} placeholder="Quantum" />
                </Field>
              </div>
              <Field label="Classification" required>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {CLASSES.map((c) => {
                    const selected = form.classification === c.value;
                    return (
                      <button key={c.value} type="button" onClick={() => update("classification", c.value)}
                        className={`p-3 rounded-xl border text-left transition ${
                          selected
                            ? "bg-slate-900 text-white border-slate-900 ring-2 ring-amber-500"
                            : "bg-white border-slate-200 hover:border-amber-300"
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{c.label}</span>
                          {selected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <span className={`text-[10px] mt-1 block ${selected ? "text-slate-300" : "text-slate-400"}`}>{c.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Seating capacity" required error={fieldErrors.seatingCapacity?.[0]}>
                  <input required type="number" min={1} max={120} value={form.seatingCapacity}
                    onChange={(e) => update("seatingCapacity", e.target.value)}
                    className={`${fieldErrors.seatingCapacity ? inputErr : inputOk} font-mono`} />
                </Field>
                <Field label="Loading bay">
                  <input value={form.loadingBay} onChange={(e) => update("loadingBay", e.target.value)} className={inputOk} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Owner name (optional)">
                  <input value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} className={inputOk} />
                </Field>
                <Field label="Owner phone (optional)">
                  <input value={form.ownerPhone} onChange={(e) => update("ownerPhone", e.target.value)} className={inputOk} />
                </Field>
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>02 · Permits & fitness</span>
              <span className="text-[10px] font-bold text-slate-400 normal-case tracking-normal ml-1">(optional)</span>
            </h2>
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 sm:p-5 space-y-4">
              <Field label="Permit number">
                <input value={form.permitNumber} onChange={(e) => update("permitNumber", e.target.value)} className={`${inputOk} font-mono`} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Permit issue">
                  <input type="date" value={form.permitIssueDate} onChange={(e) => update("permitIssueDate", e.target.value)} className={`${inputOk} font-mono`} />
                </Field>
                <Field label="Permit expiry">
                  <input type="date" value={form.permitExpiryDate} onChange={(e) => update("permitExpiryDate", e.target.value)} className={`${inputOk} font-mono`} />
                </Field>
              </div>
              <Field label="COF number">
                <input value={form.cofNumber} onChange={(e) => update("cofNumber", e.target.value)} className={`${inputOk} font-mono`} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="COF issue">
                  <input type="date" value={form.cofIssueDate} onChange={(e) => update("cofIssueDate", e.target.value)} className={`${inputOk} font-mono`} />
                </Field>
                <Field label="COF expiry">
                  <input type="date" value={form.cofExpiryDate} onChange={(e) => update("cofExpiryDate", e.target.value)} className={`${inputOk} font-mono`} />
                </Field>
              </div>
              <Field label="Association">
                <input value={form.association} onChange={(e) => update("association", e.target.value)} className={inputOk} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Insurance expiry">
                  <input type="date" value={form.insuranceExpiry} onChange={(e) => update("insuranceExpiry", e.target.value)} className={`${inputOk} font-mono`} />
                </Field>
                <Field label="Roadworthiness expiry">
                  <input type="date" value={form.roadworthinessExpiry} onChange={(e) => update("roadworthinessExpiry", e.target.value)} className={`${inputOk} font-mono`} />
                </Field>
              </div>
            </div>
          </section>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>) : (<><ShieldCheck className="w-4 h-4 text-amber-400" /> Submit vehicle record</>)}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] font-semibold text-red-600 mt-1">{error}</p>}
    </div>
  );
}
