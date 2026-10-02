/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Car, Loader2, AlertCircle, CheckCircle2, ArrowRight, UserCircle,
} from "lucide-react";

type FieldErrors = Record<string, string[] | undefined>;

const emptyForm = {
  registrationNumber: "", make: "", model: "", seatingCapacity: "15",
  classification: "kombi", driverNationalId: "", ownerName: "", ownerPhone: "",
  loadingBay: "", permitNumber: "", permitIssueDate: "", permitExpiryDate: "",
  cofNumber: "", cofIssueDate: "", cofExpiryDate: "", association: "",
  insuranceExpiry: "", roadworthinessExpiry: "",
};

const inputCls =
  "w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-emerald-500";

export default function RegisterVehiclePage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState<{
    registrationNumber: string; vic: string; driverName: string; driverNationalId: string;
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
        driverName: data.driverName,
        driverNationalId: data.driverNationalId,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <h1 className="text-lg font-black text-zinc-900 dark:text-white">Vehicle registered</h1>
          <p className="text-xs text-zinc-500">Linked to {success.driverName} via National ID.</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-2">
          <p className="font-mono text-base font-black text-zinc-900 dark:text-white">{success.registrationNumber}</p>
          <p className="text-[11px] text-zinc-500">VIC: <span className="font-mono font-bold">{success.vic}</span></p>
          <p className="text-[11px] text-zinc-500">Driver National ID: <span className="font-mono">{success.driverNationalId}</span></p>
        </div>
        <button type="button" onClick={() => router.push("/login")}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2">
          Sign in to driver portal <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <div className="mx-auto w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center mb-2">
          <Car className="w-5 h-5 text-emerald-600" />
        </div>
        <h1 className="text-lg font-black text-zinc-900 dark:text-white">Vehicle self-registration</h1>
        <p className="text-xs text-zinc-500">
          Register your kombi, midbus, or bus. Use the same National ID as your driver profile to link them.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5 text-[11px] text-amber-900 dark:text-amber-200 flex gap-2">
        <UserCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Driver account required first.{" "}
          <Link href="/register/driver" className="font-bold underline">Register as driver</Link>
          {" "}if you have not already.
        </span>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <fieldset className="space-y-3">
          <legend className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Vehicle</legend>
          <Field label="Registration number *" error={fieldErrors.registrationNumber?.[0]}>
            <input required value={form.registrationNumber} onChange={(e) => update("registrationNumber", e.target.value.toUpperCase())}
              className={inputCls + " font-mono"} placeholder="HSD 123 BM" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Make *" error={fieldErrors.make?.[0]}>
              <input required value={form.make} onChange={(e) => update("make", e.target.value)} className={inputCls} placeholder="Toyota" />
            </Field>
            <Field label="Model *" error={fieldErrors.model?.[0]}>
              <input required value={form.model} onChange={(e) => update("model", e.target.value)} className={inputCls} placeholder="Quantum" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Seating capacity *" error={fieldErrors.seatingCapacity?.[0]}>
              <input required type="number" min={1} max={120} value={form.seatingCapacity} onChange={(e) => update("seatingCapacity", e.target.value)} className={inputCls + " font-mono"} />
            </Field>
            <Field label="Classification *" error={fieldErrors.classification?.[0]}>
              <select required value={form.classification} onChange={(e) => update("classification", e.target.value)} className={inputCls}>
                <option value="kombi">Kombi</option>
                <option value="midbus">Midbus</option>
                <option value="bus">Bus</option>
              </select>
            </Field>
          </div>
          <Field label="Loading bay">
            <input value={form.loadingBay} onChange={(e) => update("loadingBay", e.target.value)} className={inputCls} />
          </Field>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Driver link (National ID)</legend>
          <Field label="Driver National ID *" error={fieldErrors.driverNationalId?.[0]}>
            <input required value={form.driverNationalId} onChange={(e) => update("driverNationalId", e.target.value)}
              className={inputCls + " font-mono"} placeholder="Same ID used on driver registration" />
          </Field>
          <p className="text-[11px] text-zinc-500">This is the only link used — not the internal driver system ID.</p>
          <Field label="Owner name (optional)">
            <input value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} className={inputCls} placeholder="Defaults to driver name" />
          </Field>
          <Field label="Owner phone (optional)">
            <input value={form.ownerPhone} onChange={(e) => update("ownerPhone", e.target.value)} className={inputCls} />
          </Field>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Permits & fitness (optional)</legend>
          <Field label="Permit number">
            <input value={form.permitNumber} onChange={(e) => update("permitNumber", e.target.value)} className={inputCls + " font-mono"} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Permit issue">
              <input type="date" value={form.permitIssueDate} onChange={(e) => update("permitIssueDate", e.target.value)} className={inputCls + " font-mono"} />
            </Field>
            <Field label="Permit expiry">
              <input type="date" value={form.permitExpiryDate} onChange={(e) => update("permitExpiryDate", e.target.value)} className={inputCls + " font-mono"} />
            </Field>
          </div>
          <Field label="COF number">
            <input value={form.cofNumber} onChange={(e) => update("cofNumber", e.target.value)} className={inputCls + " font-mono"} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="COF issue">
              <input type="date" value={form.cofIssueDate} onChange={(e) => update("cofIssueDate", e.target.value)} className={inputCls + " font-mono"} />
            </Field>
            <Field label="COF expiry">
              <input type="date" value={form.cofExpiryDate} onChange={(e) => update("cofExpiryDate", e.target.value)} className={inputCls + " font-mono"} />
            </Field>
          </div>
          <Field label="Association">
            <input value={form.association} onChange={(e) => update("association", e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Insurance expiry">
              <input type="date" value={form.insuranceExpiry} onChange={(e) => update("insuranceExpiry", e.target.value)} className={inputCls + " font-mono"} />
            </Field>
            <Field label="Roadworthiness expiry">
              <input type="date" value={form.roadworthinessExpiry} onChange={(e) => update("roadworthinessExpiry", e.target.value)} className={inputCls + " font-mono"} />
            </Field>
          </div>
        </fieldset>

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-md">
          {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Registering…</>) : (<>Register vehicle <ArrowRight className="w-4 h-4" /></>)}
        </button>
      </form>

      <p className="text-center text-[11px] text-zinc-500">
        Need a driver account?{" "}
        <Link href="/register/driver" className="font-bold text-emerald-600 hover:underline">Self-register as driver</Link>
        {" · "}
        <Link href="/login" className="font-bold text-emerald-600 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}
