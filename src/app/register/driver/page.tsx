/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Driver self-registration — same institutional form as marshal-registration
 * portal, plus driver licence / PDP fields. Data only — no login, no vehicle.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  MapPin,
  Phone,
  Heart,
  Car,
  Loader2,
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Camera,
} from "lucide-react";

type FieldErrors = Record<string, string[] | undefined>;

const REGIONS = ["Manzini", "Hhohho", "Shiselweni", "Lubombo"] as const;

const MARITAL = [
  "Married",
  "Customary Marriage (Kuteka)",
  "Civil / Religious Marriage",
  "Single",
  "Cohabiting",
  "Divorced",
  "Widowed",
  "Separated",
] as const;

const emptyForm = {
  firstName: "",
  surname: "",
  nationalId: "",
  phone: "",
  homeTelNo: "",
  whatsappNo: "",
  whatsappSameAsCell: true,
  residentialAddress: "",
  region: "Manzini" as (typeof REGIONS)[number],
  chiefOfArea: "",
  indvuna: "",
  maritalStatus: "Single",
  partnerName: "",
  numberOfKids: "0",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "Spouse",
  dateOfBirth: "",
  gender: "",
  licenseNumber: "",
  licenseClass: "",
  pdpNumber: "",
  pdpIssueDate: "",
  pdpExpiryDate: "",
  pdpIssuingAuthority: "",
  agreementAccepted: true,
  profilePictureUrl: "",
};

const inputOk =
  "w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/80 focus:border-amber-500";
const inputErr =
  "w-full px-3.5 py-2.5 rounded-xl border border-red-400 ring-1 ring-red-300 text-sm font-medium bg-white text-slate-900";

export default function RegisterDriverPage() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState<{ fullName: string; nationalId: string } | null>(null);

  function update<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "phone" && f.whatsappSameAsCell) next.whatsappNo = String(value);
      if (key === "whatsappSameAsCell" && value === true) next.whatsappNo = f.phone;
      return next;
    });
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setError("Photo must be under 1.5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("profilePictureUrl", String(reader.result ?? ""));
    reader.readAsDataURL(file);
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
        body: JSON.stringify({
          ...form,
          numberOfKids: Number(form.numberOfKids) || 0,
          whatsappNo: form.whatsappSameAsCell ? form.phone : form.whatsappNo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.issues) setFieldErrors(data.issues as FieldErrors);
        setError(data.error ?? "Registration failed");
        setLoading(false);
        return;
      }
      setSuccess({ fullName: data.fullName, nationalId: data.nationalId });
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
          <BadgeCheck className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <h1 className="text-xl font-black uppercase tracking-wider text-emerald-400">
            Profile recorded
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            No login created. Claim at rollout or admin issues credentials.
          </p>
        </div>
        <div className="p-6 space-y-2">
          <p className="font-bold text-slate-900">{success.fullName}</p>
          <p className="font-mono text-sm text-slate-700">{success.nationalId}</p>
          <Link href="/claim" className="inline-block mt-4 text-xs font-bold text-amber-700 underline">
            Claim account later →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-blue-50/80 border border-blue-200">
        <span className="text-xs font-semibold text-blue-900">
          Eswatini Field Registration · Driver enrolment (data only)
        </span>
        <Link href="/register/vehicle" className="text-[11px] font-bold text-blue-700 hover:underline">
          Vehicle record →
        </Link>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden">
        {/* SLTA header — matches marshal portal */}
        <div className="bg-slate-900 text-white p-5 sm:p-7 border-b-4 border-amber-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="text-center sm:text-left flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Shield className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-amber-400">
                  Swaziland Local Transport Association
                </h1>
                <div className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                  National Executive Committee
                </div>
              </div>
            </div>
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-center shrink-0">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Enrolment type
              </span>
              <span className="text-sm font-mono font-bold text-amber-400">DRIVER</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] sm:text-xs text-slate-400 text-center sm:text-left space-y-0.5">
            <div>
              First floor Office No. 11, Main Post office Building, Cnr. Martin & Nkoseluhlaza Street,
              MANZINI
            </div>
            <div>P. O. Box 4176, MANZINI M200, SWAZILAND · TEL/FAX: 2505 7796</div>
          </div>
          <div className="mt-4 flex justify-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500 text-slate-900 text-xs font-black uppercase tracking-wider">
              Driver Registration
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-8 space-y-8">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Identity + photo */}
          <section className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-2">
                Official profile photograph
              </label>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-2xl p-4 min-h-[200px] cursor-pointer hover:border-amber-400 hover:bg-amber-50/30">
                {form.profilePictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.profilePictureUrl}
                    alt="Preview"
                    className="w-full h-44 object-cover rounded-xl"
                  />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-slate-400" />
                    <span className="text-xs text-slate-500 text-center">
                      Capture or upload photo
                    </span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              </label>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First name(s)" required error={fieldErrors.firstName?.[0]}>
                  <input
                    required
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    className={fieldErrors.firstName ? inputErr : inputOk}
                    placeholder="e.g. Thulani Sdumo"
                  />
                </Field>
                <Field label="Surname" required error={fieldErrors.surname?.[0]}>
                  <input
                    required
                    value={form.surname}
                    onChange={(e) => update("surname", e.target.value)}
                    className={fieldErrors.surname ? inputErr : inputOk}
                    placeholder="e.g. Mkhatshwa"
                  />
                </Field>
              </div>
              <Field label="National ID" required error={fieldErrors.nationalId?.[0]}>
                <input
                  required
                  value={form.nationalId}
                  onChange={(e) => update("nationalId", e.target.value)}
                  className={`${fieldErrors.nationalId ? inputErr : inputOk} font-mono`}
                  placeholder="e.g. 8203296100441"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Date of birth">
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => update("dateOfBirth", e.target.value)}
                    className={`${inputOk} font-mono`}
                  />
                </Field>
                <Field label="Gender">
                  <div className="grid grid-cols-3 gap-2">
                    {["Male", "Female", "Other"].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => update("gender", g)}
                        className={`p-2.5 rounded-xl border text-xs font-bold ${
                          form.gender === g
                            ? "bg-slate-900 text-white border-slate-900 ring-2 ring-amber-500"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
              <Field label="Regional branch">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {REGIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => update("region", r)}
                      className={`p-2.5 rounded-xl border text-xs font-bold ${
                        form.region === r
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </section>

          <section className="space-y-4 pb-6 border-t border-slate-200 pt-6">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              Contact & address information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Residential address" required error={fieldErrors.residentialAddress?.[0]}>
                <input
                  required
                  value={form.residentialAddress}
                  onChange={(e) => update("residentialAddress", e.target.value)}
                  className={fieldErrors.residentialAddress ? inputErr : inputOk}
                  placeholder="e.g. Ndlavane"
                />
              </Field>
              <Field label="Cell phone no." required error={fieldErrors.phone?.[0]}>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    required
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className={`${fieldErrors.phone ? inputErr : inputOk} pl-10 font-mono`}
                    placeholder="e.g. 76704181"
                  />
                </div>
              </Field>
              <Field label="Home tel no.">
                <input
                  value={form.homeTelNo}
                  onChange={(e) => update("homeTelNo", e.target.value)}
                  className={inputOk}
                  placeholder="e.g. N/A or 2505 1234"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="WhatsApp no.">
                <input
                  value={form.whatsappNo}
                  onChange={(e) => update("whatsappNo", e.target.value)}
                  disabled={form.whatsappSameAsCell}
                  className={`${inputOk} font-mono disabled:bg-slate-50`}
                />
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.whatsappSameAsCell}
                    onChange={(e) => update("whatsappSameAsCell", e.target.checked)}
                  />
                  Same as cell
                </label>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Chief of area">
                <input
                  value={form.chiefOfArea}
                  onChange={(e) => update("chiefOfArea", e.target.value)}
                  className={inputOk}
                  placeholder="e.g. Logcogco Dlamini"
                />
              </Field>
              <Field label="Indvuna">
                <input
                  value={form.indvuna}
                  onChange={(e) => update("indvuna", e.target.value)}
                  className={inputOk}
                  placeholder="e.g. Jan Mngometulu"
                />
              </Field>
            </div>
          </section>

          <section className="space-y-4 pb-6 border-t border-slate-200 pt-6">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-600" />
              Family & next of kin
            </h2>
            <Field label="Marital status">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MARITAL.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => update("maritalStatus", m)}
                    className={`p-2 rounded-xl border text-[11px] font-bold text-left ${
                      form.maritalStatus === m
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Partner / spouse name">
                <input
                  value={form.partnerName}
                  onChange={(e) => update("partnerName", e.target.value)}
                  className={inputOk}
                />
              </Field>
              <Field label="Number of children">
                <input
                  type="number"
                  min={0}
                  value={form.numberOfKids}
                  onChange={(e) => update("numberOfKids", e.target.value)}
                  className={`${inputOk} font-mono`}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Next of kin name" required error={fieldErrors.emergencyContactName?.[0]}>
                <input
                  required
                  value={form.emergencyContactName}
                  onChange={(e) => update("emergencyContactName", e.target.value)}
                  className={fieldErrors.emergencyContactName ? inputErr : inputOk}
                />
              </Field>
              <Field label="Relationship">
                <input
                  value={form.emergencyContactRelation}
                  onChange={(e) => update("emergencyContactRelation", e.target.value)}
                  className={inputOk}
                  placeholder="Spouse, sibling…"
                />
              </Field>
              <Field label="Next of kin phone" required error={fieldErrors.emergencyContactPhone?.[0]}>
                <input
                  required
                  value={form.emergencyContactPhone}
                  onChange={(e) => update("emergencyContactPhone", e.target.value)}
                  className={`${fieldErrors.emergencyContactPhone ? inputErr : inputOk} font-mono`}
                />
              </Field>
            </div>
          </section>

          {/* Driver-only section */}
          <section className="space-y-4 pb-6 border-t border-slate-200 pt-6">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-amber-600" />
              Driving licence & PDP
              <span className="text-[10px] font-bold text-slate-400 normal-case tracking-normal ml-1">
                (driver-specific)
              </span>
            </h2>
            <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Licence number">
                  <input
                    value={form.licenseNumber}
                    onChange={(e) => update("licenseNumber", e.target.value)}
                    className={`${inputOk} font-mono`}
                  />
                </Field>
                <Field label="Licence class">
                  <input
                    value={form.licenseClass}
                    onChange={(e) => update("licenseClass", e.target.value)}
                    className={inputOk}
                    placeholder="e.g. Code 10"
                  />
                </Field>
              </div>
              <Field label="PDP number">
                <input
                  value={form.pdpNumber}
                  onChange={(e) => update("pdpNumber", e.target.value)}
                  className={`${inputOk} font-mono`}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="PDP issue date">
                  <input
                    type="date"
                    value={form.pdpIssueDate}
                    onChange={(e) => update("pdpIssueDate", e.target.value)}
                    className={`${inputOk} font-mono`}
                  />
                </Field>
                <Field label="PDP expiry date">
                  <input
                    type="date"
                    value={form.pdpExpiryDate}
                    onChange={(e) => update("pdpExpiryDate", e.target.value)}
                    className={`${inputOk} font-mono`}
                  />
                </Field>
              </div>
              <Field label="PDP issuing authority">
                <input
                  value={form.pdpIssuingAuthority}
                  onChange={(e) => update("pdpIssuingAuthority", e.target.value)}
                  className={inputOk}
                  placeholder="e.g. RTB / Ministry"
                />
              </Field>
            </div>
          </section>

          <section className="border-t border-slate-200 pt-6">
            <label className="flex items-start gap-3 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={form.agreementAccepted}
                onChange={(e) => update("agreementAccepted", e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I accept the SLTA association agreement and confirm the information above is true.
                No login is created by this form.
              </span>
            </label>
            {fieldErrors.agreementAccepted && (
              <p className="text-[10px] text-red-600 mt-1">{fieldErrors.agreementAccepted[0]}</p>
            )}
          </section>

          <button
            type="submit"
            disabled={loading || !form.agreementAccepted}
            className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving profile…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-amber-400" /> Submit driver registration
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] font-semibold text-red-600 mt-1">{error}</p>}
    </div>
  );
}
