/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState, useEffect } from "react";
import { Loader2, X, AlertCircle, Car, CreditCard } from "lucide-react";
import type { VehicleRow } from "@/lib/vehicles/queries";
import type { CreateVehicleRequest } from "@/hooks/useVehicleRegistry";

interface Props {
  mode: "create" | "edit";
  vehicle?: VehicleRow;
  onClose: () => void;
  onSubmit: (
    input: CreateVehicleRequest
  ) => Promise<{ success: boolean; error?: string; issues?: Record<string, string[]> }>;
}

function generateVICPreview(reg: string): string {
  if (!reg) return "";
  const clean = reg.toUpperCase().replace(/\s+/g, "");
  const letters = clean.replace(/[^A-Z]/g, "");
  const digits = clean.replace(/[^0-9]/g, "");

  let prefix = "";
  if (clean.startsWith("MSD") || clean.includes("MZ")) prefix = "MMZ";
  else if (clean.startsWith("HSD") || clean.includes("BM")) prefix = "HBM";
  else if (clean.startsWith("LSD") || clean.includes("LU")) prefix = "SLU";
  else if (clean.startsWith("SSD") || clean.includes("SH")) prefix = "SNH";
  else if (letters.length >= 3) prefix = `${letters.charAt(0)}${letters.slice(-2)}`;
  else if (letters.length > 0) prefix = (letters + "MZ").slice(0, 3);
  else prefix = "MMZ";

  const digitsPadded =
    digits.length > 0 ? digits.padStart(3, "0").slice(-3) : "001";
  return `${prefix}-${digitsPadded}`;
}

export default function VehicleFormModal({
  mode,
  vehicle,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<CreateVehicleRequest>({
    registrationNumber: vehicle?.registrationNumber ?? "",
    vic: vehicle?.vic ?? "",
    make: vehicle?.make ?? "",
    model: vehicle?.model ?? "",
    seatingCapacity: vehicle?.seatingCapacity ?? 15,
    classification: vehicle?.classification ?? "kombi",
    routeAssignmentId: vehicle?.routeAssignmentId ?? "",
    loadingBay: vehicle?.loadingBay ?? "",
    ownerName: vehicle?.ownerName ?? "",
    ownerPhone: vehicle?.ownerPhone ?? "",
    ownerOperatorId: vehicle?.ownerOperatorId ?? "",
    driverId: vehicle?.driverId ?? "",
    permitNumber: vehicle?.permitNumber ?? "",
    permitStatus: vehicle?.permitStatus ?? "Active",
    permitIssueDate: vehicle?.permitIssueDate ?? "",
    permitExpiryDate: vehicle?.permitExpiryDate ?? "",
    cofNumber: vehicle?.cofNumber ?? "",
    cofIssueDate: vehicle?.cofIssueDate ?? "",
    cofExpiryDate: vehicle?.cofExpiryDate ?? "",
    lastInspectionDate: vehicle?.lastInspectionDate ?? "",
    association: vehicle?.association ?? "",
    insuranceExpiry: vehicle?.insuranceExpiry ?? "",
    roadworthinessExpiry: vehicle?.roadworthinessExpiry ?? "",
    isMidMonthAddition: vehicle?.isMidMonthAddition ?? false,
    monthRegistered: vehicle?.monthRegistered ?? "",
    midMonthJoinDay: vehicle?.midMonthJoinDay ?? undefined,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Auto-generate VIC preview when registration changes
  useEffect(() => {
    if (mode === "create" && !form.vic && form.registrationNumber) {
      const preview = generateVICPreview(form.registrationNumber);
      // Don't set — just show preview in the helper text
    }
  }, [form.registrationNumber, form.vic, mode]);

  const update = <K extends keyof CreateVehicleRequest>(
    key: K,
    value: CreateVehicleRequest[K]
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

  const vicPreview = form.vic || generateVICPreview(form.registrationNumber);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 flex items-start justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center">
              <Car className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-zinc-900 dark:text-white">
                {mode === "create" ? "Register Vehicle" : "Edit Vehicle"}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {mode === "create"
                  ? "A Virtual Transit Card will be issued automatically."
                  : "Update vehicle details and assignments."}
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

          {/* Identification */}
          <fieldset className="space-y-3">
            <legend className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest">
              Identification
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Registration Number *" error={fieldErrors.registrationNumber?.[0]}>
                <input
                  type="text"
                  required
                  value={form.registrationNumber}
                  onChange={(e) =>
                    update("registrationNumber", e.target.value.toUpperCase())
                  }
                  disabled={mode === "edit"}
                  placeholder="HSD 101 BM"
                  className="input font-mono"
                />
              </Field>

              <Field label="FLEET-VIC" error={fieldErrors.vic?.[0]}>
                <input
                  type="text"
                  value={form.vic ?? ""}
                  onChange={(e) => update("vic", e.target.value.toUpperCase())}
                  placeholder={vicPreview || "Auto-generated"}
                  className="input font-mono"
                />
                {!form.vic && vicPreview && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                    Will be: <strong>{vicPreview}</strong>
                  </p>
                )}
              </Field>

              <Field label="Classification *">
                <select
                  value={form.classification}
                  onChange={(e) => update("classification", e.target.value)}
                  className="input"
                >
                  <option value="kombi">Kombi (15-19 seats)</option>
                  <option value="midbus">Midibus (20-35 seats)</option>
                  <option value="bus">Bus (36+ seats)</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Field label="Make *" error={fieldErrors.make?.[0]}>
                <input
                  type="text"
                  required
                  value={form.make}
                  onChange={(e) => update("make", e.target.value)}
                  placeholder="Toyota"
                  className="input"
                />
              </Field>
              <Field label="Model *" error={fieldErrors.model?.[0]}>
                <input
                  type="text"
                  required
                  value={form.model}
                  onChange={(e) => update("model", e.target.value)}
                  placeholder="Quantum Ses'fikile"
                  className="input"
                />
              </Field>
              <Field
                label="Seating Capacity *"
                error={fieldErrors.seatingCapacity?.[0]}
              >
                <input
                  type="number"
                  required
                  min={1}
                  max={120}
                  value={form.seatingCapacity}
                  onChange={(e) =>
                    update("seatingCapacity", Number(e.target.value) || 0)
                  }
                  className="input font-mono"
                />
              </Field>
              <Field label="Loading Bay">
                <input
                  type="text"
                  value={form.loadingBay}
                  onChange={(e) => update("loadingBay", e.target.value)}
                  placeholder="Bay 01"
                  className="input"
                />
              </Field>
            </div>
          </fieldset>

          {/* Assignment */}
          <fieldset className="space-y-3">
            <legend className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest">
              Assignment
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Route Assignment">
                <input
                  type="text"
                  value={form.routeAssignmentId}
                  onChange={(e) => update("routeAssignmentId", e.target.value)}
                  placeholder="e.g. h_mb_mz"
                  className="input font-mono"
                />
              </Field>
              <Field label="Assigned Driver ID">
                <input
                  type="text"
                  value={form.driverId}
                  onChange={(e) => update("driverId", e.target.value)}
                  placeholder="Leave empty or paste driver ID"
                  className="input font-mono text-xs"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Tip: copy the driver ID from the Drivers page.
                </p>
              </Field>
            </div>
          </fieldset>

          {/* Ownership */}
          <fieldset className="space-y-3">
            <legend className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest">
              Ownership
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Owner Name">
                <input
                  type="text"
                  value={form.ownerName}
                  onChange={(e) => update("ownerName", e.target.value)}
                  placeholder="e.g. Cyril Kunene"
                  className="input"
                />
              </Field>
              <Field label="Owner Phone">
                <input
                  type="tel"
                  value={form.ownerPhone}
                  onChange={(e) => update("ownerPhone", e.target.value)}
                  placeholder="+268 7600 0000"
                  className="input font-mono"
                />
              </Field>
              <Field label="Association">
                <input
                  type="text"
                  value={form.association}
                  onChange={(e) => update("association", e.target.value)}
                  placeholder="e.g. Mbabane Transport Association"
                  className="input"
                />
              </Field>
            </div>
          </fieldset>

          {/* Permits & Compliance */}
          <fieldset className="space-y-3">
            <legend className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest">
              Permits & Compliance
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Field label="Permit Number">
                <input
                  type="text"
                  value={form.permitNumber}
                  onChange={(e) => update("permitNumber", e.target.value)}
                  placeholder="G1090/2026"
                  className="input font-mono"
                />
              </Field>
              <Field label="Permit Status">
                <select
                  value={form.permitStatus}
                  onChange={(e) => update("permitStatus", e.target.value)}
                  className="input"
                >
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </Field>
              <Field label="Permit Issue">
                <input
                  type="date"
                  value={form.permitIssueDate ?? ""}
                  onChange={(e) => update("permitIssueDate", e.target.value)}
                  className="input font-mono"
                />
              </Field>
              <Field label="Permit Expiry">
                <input
                  type="date"
                  value={form.permitExpiryDate ?? ""}
                  onChange={(e) => update("permitExpiryDate", e.target.value)}
                  className="input font-mono"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Field label="COF Number">
                <input
                  type="text"
                  value={form.cofNumber}
                  onChange={(e) => update("cofNumber", e.target.value)}
                  placeholder="COF-5020-SZ"
                  className="input font-mono"
                />
              </Field>
              <Field label="COF Issue">
                <input
                  type="date"
                  value={form.cofIssueDate ?? ""}
                  onChange={(e) => update("cofIssueDate", e.target.value)}
                  className="input font-mono"
                />
              </Field>
              <Field label="COF Expiry">
                <input
                  type="date"
                  value={form.cofExpiryDate ?? ""}
                  onChange={(e) => update("cofExpiryDate", e.target.value)}
                  className="input font-mono"
                />
              </Field>
              <Field label="Last Inspection">
                <input
                  type="date"
                  value={form.lastInspectionDate ?? ""}
                  onChange={(e) => update("lastInspectionDate", e.target.value)}
                  className="input font-mono"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Insurance Expiry">
                <input
                  type="date"
                  value={form.insuranceExpiry ?? ""}
                  onChange={(e) => update("insuranceExpiry", e.target.value)}
                  className="input font-mono"
                />
              </Field>
              <Field label="Roadworthiness Expiry">
                <input
                  type="date"
                  value={form.roadworthinessExpiry ?? ""}
                  onChange={(e) => update("roadworthinessExpiry", e.target.value)}
                  className="input font-mono"
                />
              </Field>
            </div>
          </fieldset>

          {/* Mid-month rotation */}
          <fieldset className="space-y-3">
            <legend className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest">
              30-Day Rotation
            </legend>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.isMidMonthAddition}
                onChange={(e) =>
                  update("isMidMonthAddition", e.target.checked)
                }
                className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <div className="font-bold text-zinc-900 dark:text-white">
                  Added mid-month (tail-lock)
                </div>
                <div className="text-zinc-500 text-[11px] mt-0.5">
                  Vehicle will be pinned to the tail of the queue for the
                  remainder of this 30-day cycle. It graduates to the regular
                  rotation next month.
                </div>
              </div>
            </label>

            {form.isMidMonthAddition && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Month Registered (YYYY-MM)">
                  <input
                    type="text"
                    value={form.monthRegistered}
                    onChange={(e) => update("monthRegistered", e.target.value)}
                    placeholder="2026-09"
                    className="input font-mono"
                  />
                </Field>
                <Field label="Join Day (1–31)">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={form.midMonthJoinDay ?? ""}
                    onChange={(e) =>
                      update(
                        "midMonthJoinDay",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="input font-mono"
                  />
                </Field>
              </div>
            )}
          </fieldset>

          {/* Auto card note */}
          {mode === "create" && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-emerald-900 dark:text-emerald-200">
                <div className="font-bold">Virtual Transit Card auto-issued</div>
                <div className="text-[11px] mt-0.5">
                  On save, a Virtual Transit Card is issued with a{" "}
                  <strong>E450 registration fee</strong> recorded and an initial
                  balance of <strong>E1,525</strong>. The card number and receipt
                  appear in the Fleet Manager view.
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
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {mode === "create" ? "Register Vehicle" : "Save Changes"}
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
          border-color: rgb(16 185 129);
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
