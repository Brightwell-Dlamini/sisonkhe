/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Loader2, X, AlertCircle, Landmark } from "lucide-react";
import type { CreateAssociationInput } from "@/lib/associations/mutations";
import { ASSOCIATION_STATUSES } from "@/lib/domain/associations";

interface Props {
  defaultRegionCode?: string | null;
  onClose: () => void;
  onSubmit: (
    input: CreateAssociationInput
  ) => Promise<{ success: boolean; error?: string; issues?: Record<string, string[]> }>;
}

export default function AssociationFormModal({
  defaultRegionCode,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<{
    name: string;
    shortName: string;
    registrationNumber: string;
    regionCode: string;
    status: (typeof ASSOCIATION_STATUSES)[number];
    chairName: string;
    contactPhone: string;
    contactEmail: string;
    physicalAddress: string;
    notes: string;
    queuePriorityWeight: number;
  }>({
    name: "",
    shortName: "",
    registrationNumber: "",
    regionCode: defaultRegionCode ?? "",
    status: "Active",
    chairName: "",
    contactPhone: "",
    contactEmail: "",
    physicalAddress: "",
    notes: "",
    queuePriorityWeight: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    const payload: CreateAssociationInput = {
      name: form.name.trim(),
      shortName: form.shortName.trim() || null,
      registrationNumber: form.registrationNumber.trim() || null,
      regionCode: form.regionCode.trim(),
      status: form.status,
      chairName: form.chairName.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
      physicalAddress: form.physicalAddress.trim() || null,
      notes: form.notes.trim() || null,
      queuePriorityWeight: form.queuePriorityWeight,
    };

    const result = await onSubmit(payload);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Failed to save");
      if (result.issues) setFieldErrors(result.issues);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#0F0F10] flex items-start justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/60 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-white">
                Register Association
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Create a transport association for membership and rank rules.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          {error && (
            <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <fieldset className="space-y-3">
            <legend className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">
              Identity
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Association Name *" error={fieldErrors.name?.[0]}>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. Hhohho Taxi Association"
                  className="input"
                />
              </Field>
              <Field label="Short Name" error={fieldErrors.shortName?.[0]}>
                <input
                  type="text"\Psi                  value={form.shortName}
                  onChange={(e) => update("shortName", e.target.value)}
                  placeholder="e.g. HTA"
                  className="input"
                />
              </Field>
              <Field
                label="Registration Number"
                error={fieldErrors.registrationNumber?.[0]}
              >
                <input
                  type="text"
                  value={form.registrationNumber}
                  onChange={(e) => update("registrationNumber", e.target.value)}
                  className="input font-mono"
                />
              </Field>
              <Field label="Region Code *" error={fieldErrors.regionCode?.[0]}>
                <input
                  type="text"
                  required
                  value={form.regionCode}
                  onChange={(e) => update("regionCode", e.target.value)}
                  placeholder="e.g. HHOHHO"
                  className="input font-mono uppercase"
                  disabled={!!defaultRegionCode}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">
              Contact & leadership
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Chair Name">
                <input
                  type="text"
                  value={form.chairName}
                  onChange={(e) => update("chairName", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Contact Phone">
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => update("contactPhone", e.target.value)}
                  placeholder="+268 …"
                  className="input font-mono"
                />
              </Field>
              <Field label="Contact Email" error={fieldErrors.contactEmail?.[0]}>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => update("contactEmail", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) =>
                    update(
                      "status",
                      e.target.value as (typeof ASSOCIATION_STATUSES)[number]
                    )
                  }
                  className="input"
                >
                  {ASSOCIATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Physical Address">
              <input
                type="text"
                value={form.physicalAddress}
                onChange={(e) => update("physicalAddress", e.target.value)}
                className="input"
              />
            </Field>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">
              Operations
            </legend>
            <Field label="Queue priority weight (0–100)">
              <input
                type="number"
                min={0}
                max={100}
                value={form.queuePriorityWeight}
                onChange={(e) =>
                  update("queuePriorityWeight", Number(e.target.value) || 0)
                }
                className="input font-mono w-32"
              />
            </Field>
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
                className="input resize-y"
              />
            </Field>
          </fieldset>

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-[#0F0F10] pb-1">
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
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Register Association
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
        {label}
      </label>
      {children}
      {error && <p className="text-[10px] text-red-400 mt-0.5">{error}</p>}
    </div>
  );
}
