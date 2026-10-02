/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Driver self-registration — institutional form design inspired by
 * the Marshal Registration portal.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  User,
  IdCard,
  Phone,
  MapPin,
  Calendar,
  Car,
  Heart,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";

type FieldErrors = Record<string, string[] | undefined>;

const emptyForm = {
  fullName: "",
  nationalId: "",
  phone: "",
  residentialAddress: "",
  dateOfBirth: "",
  gender: "",
  licenseNumber: "",
  licenseClass: "",
  pdpNumber: "",
  pdpIssueDate: "",
  pdpExpiryDate: "",
  pdpIssuingAuthority: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "",
  password: "",
  confirmPassword: "",
};

const GENDERS = ["Male", "Female", "Other"] as const;

const inputBase =
  "w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/80 focus:border-amber-500 transition";
const inputOk = `${inputBase} border-slate-300 hover:border-slate-400`;
const inputErr = `${inputBase} border-red-400 ring-1 ring-red-300`;

export default function RegisterDriverPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState<{
    username: string;
    fullName: string;
    nationalId: string;
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
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden">
        <div className="bg-slate-900 text-white p-6 sm:p-8 border-b-4 border-emerald-500 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center mb-4">
            <BadgeCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-emerald-400">
            Registration Confirmed
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Driver profile active in the national transport registry
          </p>
        </div>
        <div className="p-6 sm:p-8 space-y-5">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">
              Sign-in credentials
            </p>
            <div>
              <span className="text-[11px] text-slate-500 uppercase font-bold">Username</span>
              <p className="font-mono text-lg font-black text-slate-900">{success.username}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-200/80">
              <div>
                <span className="text-[11px] text-slate-500 uppercase font-bold">Full name</span>
                <p className="text-sm font-bold text-slate-800">{success.fullName}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 uppercase font-bold">National ID</span>
                <p className="font-mono text-sm font-bold text-slate-800">{success.nationalId}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 pt-1">
              Use the password you chose. Keep your username safe — you will need it to sign in.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider shadow-sm"
            >
              Sign in now
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              href="/register/vehicle"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-black uppercase tracking-wider"
            >
              <Car className="w-4 h-4 text-amber-600" />
              Register vehicle
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-blue-50/80 border border-blue-200">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-700 shrink-0" />
          <span className="text-xs font-semibold text-blue-900">
            Official driver enrolment · National ID links your vehicle later
          </span>
        </div>
        <Link href="/register/vehicle" className="text-[11px] font-bold text-blue-700 hover:underline">
          Already registered? Add vehicle →
        </Link>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden">
        <div className="bg-slate-900 text-white p-5 sm:p-7 border-b-4 border-amber-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="text-center sm:text-left flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <User className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-amber-400">
                  Driver Self-Registration
                </h1>
                <div className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                  Sisonkhe In Transit · Kingdom of Eswatini
                </div>
              </div>
            </div>
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-center shrink-0">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Account status
              </span>
              <span className="text-sm font-mono font-bold text-amber-400">ACTIVE ON SAVE</span>
            </div>
          </div>
          <p className="mt-3 text-[11px] sm:text-xs text-slate-400 text-center sm:text-left">
            Complete all required fields marked with *. Your National ID is the primary link to any
            vehicle you register.
          </p>
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
              <IdCard className="w-4 h-4 text-amber-600" />
              <span>01 · Personal identity</span>
            </h2>
            <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 sm:p-5 space-y-4">
              <Field label="Full legal name" required error={fieldErrors.fullName?.[0]}>
                <input required value={form.fullName} onChange={(e) => update("fullName", e.target.value)}
                  className={fieldErrors.fullName ? inputErr : inputOk} autoComplete="name"
                  placeholder="As on national identity document" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="National ID" required error={fieldErrors.nationalId?.[0]}>
                  <input required value={form.nationalId} onChange={(e) => update("nationalId", e.target.value)}
                    className={`${fieldErrors.nationalId ? inputErr : inputOk} font-mono`} placeholder="e.g. 8701016123456" />
                </Field>
                <Field label="Mobile phone" required error={fieldErrors.phone?.[0]}>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input required value={form.phone} onChange={(e) => update("phone", e.target.value)}
                      className={`${fieldErrors.phone ? inputErr : inputOk} pl-10`} placeholder="+268 …" autoComplete="tel" />
                  </div>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Date of birth" error={fieldErrors.dateOfBirth?.[0]}>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)}
                      className={`${inputOk} pl-10 font-mono`} />
                  </div>
                </Field>
                <Field label="Gender">
                  <div className="grid grid-cols-3 gap-2">
                    {GENDERS.map((g) => {
                      const selected = form.gender === g;
                      return (
                        <button key={g} type="button" onClick={() => update("gender", g)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                            selected
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-amber-500"
                              : "bg-white text-slate-800 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50"
                          }`}>{g}</button>
                      );
                    })}
                  </div>
                </Field>
              </div>
              <Field label="Residential address">
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input value={form.residentialAddress} onChange={(e) => update("residentialAddress", e.target.value)}
                    className={`${inputOk} pl-10`} placeholder="Physical home address" />
                </div>
              </Field>
            </div>
          </section>

          <section className="space-y-5 pb-6 border-b border-slate-200">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-blue-600" />
              <span>02 · Driving licence & PDP</span>
            </h2>
            <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Licence number" error={fieldErrors.licenseNumber?.[0]}>
                  <input value={form.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} className={`${inputOk} font-mono`} />
                </Field>
                <Field label="Licence class">
                  <input value={form.licenseClass} onChange={(e) => update("licenseClass", e.target.value)} className={inputOk} placeholder="e.g. Code 10" />
                </Field>
              </div>
              <Field label="PDP number">
                <input value={form.pdpNumber} onChange={(e) => update("pdpNumber", e.target.value)} className={`${inputOk} font-mono`} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="PDP issue date">
                  <input type="date" value={form.pdpIssueDate} onChange={(e) => update("pdpIssueDate", e.target.value)} className={`${inputOk} font-mono`} />
                </Field>
                <Field label="PDP expiry date">
                  <input type="date" value={form.pdpExpiryDate} onChange={(e) => update("pdpExpiryDate", e.target.value)} className={`${inputOk} font-mono`} />
                </Field>
              </div>
              <Field label="PDP issuing authority">
                <input value={form.pdpIssuingAuthority} onChange={(e) => update("pdpIssuingAuthority", e.target.value)} className={inputOk} placeholder="e.g. RTB / Ministry" />
              </Field>
            </div>
          </section>

          <section className="space-y-5 pb-6 border-b border-slate-200">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-600" />
              <span>03 · Emergency contact</span>
            </h2>
            <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-4 sm:p-5 space-y-4">
              <Field label="Contact name">
                <input value={form.emergencyContactName} onChange={(e) => update("emergencyContactName", e.target.value)} className={inputOk} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Contact phone">
                  <input value={form.emergencyContactPhone} onChange={(e) => update("emergencyContactPhone", e.target.value)} className={inputOk} />
                </Field>
                <Field label="Relation">
                  <input value={form.emergencyContactRelation} onChange={(e) => update("emergencyContactRelation", e.target.value)} className={inputOk} placeholder="Spouse, sibling…" />
                </Field>
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-slate-700" />
              <span>04 · Account password</span>
            </h2>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <p className="text-xs text-slate-600">
                A username is generated from your full name after submission. Choose a strong password
                (minimum 8 characters).
              </p>
              <Field label="Password" required error={fieldErrors.password?.[0]}>
                <div className="relative">
                  <input required type={showPassword ? "text" : "password"} value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    className={`${fieldErrors.password ? inputErr : inputOk} pr-11`} autoComplete="new-password" minLength={8} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm password" required error={fieldErrors.confirmPassword?.[0]}>
                <input required type={showPassword ? "text" : "password"} value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  className={fieldErrors.confirmPassword ? inputErr : inputOk} autoComplete="new-password" />
              </Field>
            </div>
          </section>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20">
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>) : (<><CheckCircle2 className="w-4 h-4 text-amber-400" /> Submit driver registration</>)}
          </button>

          <p className="text-center text-[11px] text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-amber-700 hover:underline">Sign in</Link>
          </p>
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
