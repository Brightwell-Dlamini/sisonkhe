/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Loader2, X, AlertCircle, Building2, CreditCard } from "lucide-react";
import type { OperatorRow } from "@/lib/operators/queries";
import type { CreateOperatorRequest } from "@/hooks/useOperators";

interface Props {
  mode: "create" | "edit";
  operator?: OperatorRow;
  onClose: () => void;
  onSubmit: (
    input: CreateOperatorRequest
  ) => Promise<{ success: boolean; error?: string; issues?: Record<string, string[]> }>;
}

export default function OperatorFormModal({
  mode,
  operator,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<CreateOperatorRequest>({
    name: operator?.name ?? "",
    companyName: operator?.companyName ?? "",
    phone: operator?.phone ?? "",
    email: operator?.email ?? "",
    nationalId: operator?.nationalId ?? "",
    taxNumber: operator?.taxNumber ?? "",
    association: operator?.association ?? "",
    bankAccountRef: operator?.bankAccountRef ?? "",
    operatorLicenseNumber: operator?.operatorLicenseNumber ?? "",
    avatarUrl: operator?.avatarUrl ?? "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const update = <K extends keyof CreateOperatorRequest>(
    key: K,
    value: CreateOperatorRequest[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    const result = await onSubmit(form);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Failed to save");
      if (result.issues) setFieldErrors(result.issues);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 flex items-start justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-zinc-900 dark:text-white">
                {mode === "create" ? "Register Operator" : "Edit Operator"}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {mode === "create"
                  ? "A Master Card will be issued with an enterprise seed balance."
                  : "Update operator details."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Identity */}
          <fieldset className="space-y-3">
            <legend className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-widest">
              Identity
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full Name *" error={fieldErrors.name?.[0]}>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. Cyril Kunene"
                  className="input"
                />
              </Field>

              <Field label="Company / Fleet Name *" error={fieldErrors.companyName?.[0]}>
                <input
                  type="text"
                  required
                  value={form.companyName}
                  onChange={(e) => update("companyName", e.target.value)}
                  placeholder="e.g. Kunene Express & Transit"
                  className="input"
                />
              </Field>

              <Field label="National ID">
                <input
                  type="text"
                  value={form.nationalId}
                  onChange={(e) => update("nationalId", e.target.value)}
                  placeholder="13 digits"
                  className="input font-mono"
                />
              </Field>

              <Field label="Tax Number (TIN)">
                <input
                  type="text"
                  value={form.taxNumber}
                  onChange={(e) => update("taxNumber", e.target.value)}
                  placeholder="TIN-SZ-000000"
                  className="input font-mono"
                />
              </Field>
            </div>
          </fieldset>

          {/* Contact */}
          <fieldset className="space-y-3">
            <legend className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-widest">
              Contact
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Phone *" error={fieldErrors.phone?.[0]}>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+268 7600 0000"
                  className="input font-mono"
                />
              </Field>

              <Field label="Email * (also login)" error={fieldErrors.email?.[0]}>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="cyril@transit.co.sz"
                  disabled={mode === "edit"}
                  className="input"
                />
                {mode === "edit" && (
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Email cannot be changed.
                  </p>
                )}
              </Field>
            </div>
          </fieldset>

          {/* Operations */}
          <fieldset className="space-y-3">
            <legend className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-widest">
              Operations
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Association">
                <input
                  type="text"
                  value={form.association}
                  onChange={(e) => update("association", e.target.value)}
                  placeholder="Hhohho Kombi Association"
                  className="input"
                />
              </Field>

              <Field label="Operator License Number">
                <input
                  type="text"
                  value={form.operatorLicenseNumber}
                  onChange={(e) => update("operatorLicenseNumber", e.target.value)}
                  placeholder="OP-HHO-2024-0012"
                  className="input font-mono"
                />
              </Field>
            </div>

            <Field label="Bank Account Reference">
              <input
                type="text"
                value={form.bankAccountRef}
                onChange={(e) => update("bankAccountRef", e.target.value)}
                placeholder="FNB Eswatini • Acc ending 4901"
                className="input"
              />
            </Field>
          </fieldset>

          {/* Master Card note */}
          {mode === "create" && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-900 dark:text-amber-200">
                <div className="font-bold">Master Card auto-issued</div>
                <div className="text-[11px] mt-0.5">
                  On save, an <strong>Enterprise Master Card</strong> is issued
                  with a <strong>E15,000 seed balance</strong> for disbursing to
                  the operator's fleet vehicle cards.
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-white dark:bg-zinc-900 pb-1">
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
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {mode === "create" ? "Register Operator" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          background-color: rgb(250 250 250);
          border: 1px solid rgb(228 228 231);
          border-radius: 0.75rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: rgb(24 24 27);
          outline: none;
        }
        :global(.dark) .input {
          background-color: rgb(9 9 11);
          border-color: rgb(39 39 42);
          color: white;
        }
        .input:focus {
          border-color: rgb(245 158 11);
        }
      `}</style>
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
      <label className="block text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}
