/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserCircle, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, ArrowRight, Car,
} from "lucide-react";

type FieldErrors = Record<string, string[] | undefined>;

const emptyForm = {
  fullName: "", nationalId: "", phone: "", residentialAddress: "",
  dateOfBirth: "", gender: "", licenseNumber: "", licenseClass: "",
  pdpNumber: "", pdpIssueDate: "", pdpExpiryDate: "", pdpIssuingAuthority: "",
  emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelation: "",
  password: "", confirmPassword: "",
};

const inputCls =
  "w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-blue-500";

export default function RegisterDriverPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState<{
    username: string; fullName: string; nationalId: string;
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
      const res = await fetch("/api/register/driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.issues) setFieldErrors(data.issues as FieldErrors);
        setError(data.error ?? "Registration failed");
        setLoading(false);
        return;
      }
      setSuccess({
        username: data.username,
        fullName: data.fullName,
        nationalId: data.nationalId,
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
          <h1 className="text-lg font-black text-zinc-900 dark:text-white">Driver registered</h1>
          <p className="text-xs text-zinc-500">Welcome, {success.fullName}. Your account is active.</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Sign-in username</p>
          <p className="font-mono text-base font-black text-zinc-900 dark:text-white">{success.username}</p>
          <p className="text-[11px] text-zinc-500">National ID: <span className="font-mono">{success.nationalId}</span></p>
          <p className="text-[11px] text-zinc-500">Use the password you chose. Save your username somewhere safe.</p>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => router.push("/login")}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2">
            Sign in now <ArrowRight className="w-4 h-4" />
          </button>
          <Link href="/register/vehicle"
            className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2">
            <Car className="w-4 h-4" /> Register a vehicle next
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <div className="mx-auto w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center mb-2">
          <UserCircle className="w-5 h-5 text-blue-600" />
        </div>
        <h1 className="text-lg font-black text-zinc-900 dark:text-white">Driver self-registration</h1>
        <p className="text-xs text-zinc-500">Create your Sisonkhe driver account. National ID links you to your vehicle.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <fieldset className="space-y-3">
          <legend className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Identity</legend>
          <Field label="Full name *" error={fieldErrors.fullName?.[0]}>
            <input required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} className={inputCls} autoComplete="name" />
          </Field>
          <Field label="National ID *" error={fieldErrors.nationalId?.[0]}>
            <input required value={form.nationalId} onChange={(e) => update("nationalId", e.target.value)} className={inputCls + " font-mono"} placeholder="e.g. 8701016123456" />
          </Field>
          <Field label="Phone *" error={fieldErrors.phone?.[0]}>
            <input required value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputCls} placeholder="+268 …" autoComplete="tel" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth" error={fieldErrors.dateOfBirth?.[0]}>
              <input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} className={inputCls + " font-mono"} />
            </Field>
            <Field label="Gender">
              <select value={form.gender} onChange={(e) => update("gender", e.target.value)} className={inputCls}>
                <option value="">—</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </Field>
          </div>
          <Field label="Residential address">
            <input value={form.residentialAddress} onChange={(e) => update("residentialAddress", e.target.value)} className={inputCls} />
          </Field>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Licence & PDP</legend>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Licence number" error={fieldErrors.licenseNumber?.[0]}>
              <input value={form.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} className={inputCls + " font-mono"} />
            </Field>
            <Field label="Licence class">
              <input value={form.licenseClass} onChange={(e) => update("licenseClass", e.target.value)} className={inputCls} placeholder="e.g. Code 10" />
            </Field>
          </div>
          <Field label="PDP number">
            <input value={form.pdpNumber} onChange={(e) => update("pdpNumber", e.target.value)} className={inputCls + " font-mono"} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="PDP issue date">
              <input type="date" value={form.pdpIssueDate} onChange={(e) => update("pdpIssueDate", e.target.value)} className={inputCls + " font-mono"} />
            </Field>
            <Field label="PDP expiry date">
              <input type="date" value={form.pdpExpiryDate} onChange={(e) => update("pdpExpiryDate", e.target.value)} className={inputCls + " font-mono"} />
            </Field>
          </div>
          <Field label="PDP issuing authority">
            <input value={form.pdpIssuingAuthority} onChange={(e) => update("pdpIssuingAuthority", e.target.value)} className={inputCls} />
          </Field>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Emergency contact</legend>
          <Field label="Name">
            <input value={form.emergencyContactName} onChange={(e) => update("emergencyContactName", e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <input value={form.emergencyContactPhone} onChange={(e) => update("emergencyContactPhone", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Relation">
              <input value={form.emergencyContactRelation} onChange={(e) => update("emergencyContactRelation", e.target.value)} className={inputCls} placeholder="Spouse, sibling…" />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Account password</legend>
          <p className="text-[11px] text-zinc-500">A username is generated from your name. You choose the password.</p>
          <Field label="Password *" error={fieldErrors.password?.[0]}>
            <div className="relative">
              <input required type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)}
                className={inputCls + " pr-10"} autoComplete="new-password" minLength={8} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <Field label="Confirm password *" error={fieldErrors.confirmPassword?.[0]}>
            <input required type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)}
              className={inputCls} autoComplete="new-password" />
          </Field>
        </fieldset>

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-md">
          {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>) : (<>Register as driver <ArrowRight className="w-4 h-4" /></>)}
        </button>
      </form>

      <p className="text-center text-[11px] text-zinc-500">
        Already registered?{" "}
        <Link href="/login" className="font-bold text-emerald-600 hover:underline">Sign in</Link>
        {" · "}
        <Link href="/register/vehicle" className="font-bold text-emerald-600 hover:underline">Register vehicle</Link>
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
