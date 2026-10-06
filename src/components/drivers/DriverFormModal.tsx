/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create = provision login + profile (no vehicle).
 * Edit = profile + staff assignment of vehicle.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X, AlertCircle } from "lucide-react";
import ImageUploadField from "@/components/common/ImageUploadField";
import type { DriverRow } from "@/lib/drivers/queries";
import type { CreateDriverRequest } from "@/hooks/useDrivers";
import {
  filterAssignableVehicles,
  vehicleOptionLabel,
} from "@/lib/domain/eligibility";

type VehicleOption = {
  registrationNumber: string;
  driverId: string | null;
  make?: string | null;
  model?: string | null;
  status?: string | null;
  permitStatus?: string | null;
};

interface Props {
  mode: "create" | "edit";
  driver?: DriverRow;
  onClose: () => void;
  onSubmit: (
    input: CreateDriverRequest
  ) => Promise<{ success: boolean; error?: string; issues?: Record<string, string[]> }>;
}

export default function DriverFormModal({
  mode,
  driver,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<CreateDriverRequest>({
    fullName: driver?.fullName ?? "",
    nationalId: driver?.nationalId ?? "",
    phone: driver?.phone ?? "",
    residentialAddress: driver?.residentialAddress ?? "",
    dateOfBirth: driver?.dateOfBirth ?? "",
    gender: driver?.gender ?? "",
    licenseNumber: driver?.licenseNumber ?? "",
    licenseClass: driver?.licenseClass ?? "",
    pdpNumber: driver?.pdpNumber ?? "",
    pdpIssueDate: driver?.pdpIssueDate ?? "",
    pdpExpiryDate: driver?.pdpExpiryDate ?? "",
    pdpIssuingAuthority: driver?.pdpIssuingAuthority ?? "",
    pdpStatus: driver?.pdpStatus ?? "Valid",
    emergencyContactName: driver?.emergencyContactName ?? "",
    emergencyContactPhone: driver?.emergencyContactPhone ?? "",
    emergencyContactRelation: driver?.emergencyContactRelation ?? "",
    assignedVehicleReg: driver?.assignedVehicleReg ?? "",
    status: driver?.status ?? "Active",
    profilePictureUrl: driver?.profilePictureUrl ?? "",
  });

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(mode === "edit");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (mode !== "edit") return;
    let cancelled = false;
    (async () => {
      setVehiclesLoading(true);
      try {
        const res = await fetch("/api/vehicles", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          setVehicles(
            (data.vehicles ?? []).map(
              (v: {
                registrationNumber: string;
                driverId?: string | null;
                make?: string;
                model?: string;
                status?: string;
                permitStatus?: string | null;
              }) => ({
                registrationNumber: v.registrationNumber,
                driverId: v.driverId ?? null,
                make: v.make,
                model: v.model,
                status: v.status,
                permitStatus: v.permitStatus,
              })
            )
          );
        }
      } catch {
        if (!cancelled) setVehicles([]);
      } finally {
        if (!cancelled) setVehiclesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const eligibleVehicles = useMemo(() => {
    return filterAssignableVehicles(
      vehicles,
      driver?.id ?? null,
      form.assignedVehicleReg || driver?.assignedVehicleReg
    );
  }, [vehicles, driver?.id, form.assignedVehicleReg, driver?.assignedVehicleReg]);

  const update = <K extends keyof CreateDriverRequest>(
    key: K,
    value: CreateDriverRequest[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    const payload =
      mode === "create"
        ? { ...form, assignedVehicleReg: "" }
        : form;

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
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-white">
              {mode === "create" ? "Add driver + issue login" : "Edit Driver"}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {mode === "create"
                ? "Creates profile and login. Vehicle assignment is done after, on Edit."
                : "Assign vehicle only here (or via staff assignment API)."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && (
            <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <fieldset className="space-y-3">
            <legend className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">
              Personal Details
            </legend>

            <ImageUploadField
              label="Profile photo"
              value={form.profilePictureUrl ?? ""}
              onChange={(url) => update("profilePictureUrl", url)}
              folder="drivers"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full Name *" error={fieldErrors.fullName?.[0]}>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="National ID" error={fieldErrors.nationalId?.[0]}>
                <input
                  type="text"
                  value={form.nationalId}
                  onChange={(e) => update("nationalId", e.target.value)}
                  className="input font-mono"
                />
              </Field>

              <Field label="Phone *" error={fieldErrors.phone?.[0]}>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className="input font-mono"
                />
              </Field>

              <Field label="Date of Birth">
                <input
                  type="date"
                  value={form.dateOfBirth ?? ""}
                  onChange={(e) => update("dateOfBirth", e.target.value)}
                  className="input font-mono"
                />
              </Field>

              <Field label="Gender">
                <select
                  value={form.gender}
                  onChange={(e) => update("gender", e.target.value)}
                  className="input"
                >
                  <option value="">—</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </Field>

              <Field label="Residential Address">
                <input
                  type="text"
                  value={form.residentialAddress}
                  onChange={(e) => update("residentialAddress", e.target.value)}
                  className="input"
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">
              Driving Licence & PDP
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Licence Number">
                <input
                  type="text"
                  value={form.licenseNumber}
                  onChange={(e) => update("licenseNumber", e.target.value)}
                  className="input font-mono"
                />
              </Field>
              <Field label="Licence Class">
                <input
                  type="text"
                  value={form.licenseClass}
                  onChange={(e) => update("licenseClass", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="PDP Number">
                <input
                  type="text"
                  value={form.pdpNumber}
                  onChange={(e) => update("pdpNumber", e.target.value)}
                  className="input font-mono"
                />
              </Field>
              <Field label="PDP Status">
                <select
                  value={form.pdpStatus}
                  onChange={(e) => update("pdpStatus", e.target.value)}
                  className="input"
                >
                  <option>Valid</option>
                  <option>Expired</option>
                  <option>Suspended</option>
                </select>
              </Field>
              <Field label="PDP Issue">
                <input
                  type="date"
                  value={form.pdpIssueDate ?? ""}
                  onChange={(e) => update("pdpIssueDate", e.target.value)}
                  className="input font-mono"
                />
              </Field>
              <Field label="PDP Expiry">
                <input
                  type="date"
                  value={form.pdpExpiryDate ?? ""}
                  onChange={(e) => update("pdpExpiryDate", e.target.value)}
                  className="input font-mono"
                />
              </Field>
            </div>
          </fieldset>

          {mode === "edit" && (
            <fieldset className="space-y-3">
              <legend className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">
                Staff assignment
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Assigned vehicle">
                  <select
                    value={form.assignedVehicleReg ?? ""}
                    onChange={(e) => update("assignedVehicleReg", e.target.value)}
                    className="input font-mono"
                    disabled={vehiclesLoading}
                  >
                    <option value="">— No vehicle —</option>
                    {eligibleVehicles.map((v) => (
                      <option
                        key={v.registrationNumber}
                        value={v.registrationNumber}
                      >
                        {vehicleOptionLabel(v)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-zinc-500">
                    Staff only. Eligible free vehicles only.
                  </p>
                </Field>
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => update("status", e.target.value)}
                    className="input"
                  >
                    <option>Active</option>
                    <option>Suspended</option>
                    <option>On Leave</option>
                    <option>Off-Duty</option>
                  </select>
                </Field>
              </div>
            </fieldset>
          )}

          {mode === "create" && (
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
                className="input"
              >
                <option>Active</option>
                <option>Suspended</option>
                <option>On Leave</option>
                <option>Off-Duty</option>
              </select>
            </Field>
          )}

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
              {mode === "create" ? "Create + issue login" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

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
      <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}
