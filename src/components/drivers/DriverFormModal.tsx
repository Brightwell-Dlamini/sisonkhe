/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Loader2, X, AlertCircle } from "lucide-react";
import type { DriverRow } from "@/lib/drivers/queries";
import type { CreateDriverRequest } from "@/hooks/useDrivers";

interface Props {
  mode: "create" | "edit";
  driver?: DriverRow;
  onClose: () => void;
  onSubmit: (
    input: CreateDriverRequest
  ) => Promise<{
    success: boolean;
    error?: string;
    issues?: Record<string, string[]>;
  }>;
}

const STATUSES = ["Active", "Suspended", "On Leave", "Off-Duty"] as const;
const GENDERS = ["Male", "Female", "Other"] as const;
const PDP_STATUSES = ["Valid", "Expired", "Suspended"] as const;

export default function DriverFormModal({
  mode,
  driver,
  onClose,
  onSubmit,
}: Props) {
  const [fullName, setFullName] = useState(driver?.fullName ?? "");
  const [nationalId, setNationalId] = useState(driver?.nationalId ?? "");
  const [phone, setPhone] = useState(driver?.phone ?? "");
  const [residentialAddress, setResidentialAddress] = useState(
    driver?.residentialAddress ?? ""
  );
  const [dateOfBirth, setDateOfBirth] = useState(driver?.dateOfBirth ?? "");
  const [gender, setGender] = useState(driver?.gender ?? "");
  const [licenseNumber, setLicenseNumber] = useState(driver?.licenseNumber ?? "");
  const [licenseClass, setLicenseClass] = useState(driver?.licenseClass ?? "");
  const [pdpNumber, setPdpNumber] = useState(driver?.pdpNumber ?? "");
  const [pdpIssueDate, setPdpIssueDate] = useState(driver?.pdpIssueDate ?? "");
  const [pdpExpiryDate, setPdpExpiryDate] = useState(driver?.pdpExpiryDate ?? "");
  const [pdpIssuingAuthority, setPdpIssuingAuthority] = useState(
    driver?.pdpIssuingAuthority ?? ""
  );
  const [pdpStatus, setPdpStatus] = useState(driver?.pdpStatus ?? "Valid");
  const [emergencyContactName, setEmergencyContactName] = useState(
    driver?.emergencyContactName ?? ""
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    driver?.emergencyContactPhone ?? ""
  );
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(
    driver?.emergencyContactRelation ?? ""
  );
  const [assignedVehicleReg, setAssignedVehicleReg] = useState(
    driver?.assignedVehicleReg ?? ""
  );
  const [status, setStatus] = useState(driver?.status ?? "Active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    const input: CreateDriverRequest = {
      fullName: fullName.trim(),
      nationalId: nationalId.trim() || undefined,
      phone: phone.trim(),
      residentialAddress: residentialAddress.trim() || undefined,
      dateOfBirth: dateOfBirth.trim() || undefined,
      gender: gender || undefined,
      licenseNumber: licenseNumber.trim() || undefined,
      licenseClass: licenseClass.trim() || undefined,
      pdpNumber: pdpNumber.trim() || undefined,
      pdpIssueDate: pdpIssueDate.trim() || undefined,
      pdpExpiryDate: pdpExpiryDate.trim() || undefined,
      pdpIssuingAuthority: pdpIssuingAuthority.trim() || undefined,
      pdpStatus: pdpStatus || undefined,
      emergencyContactName: emergencyContactName.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      emergencyContactRelation: emergencyContactRelation.trim() || undefined,
      assignedVehicleReg: assignedVehicleReg.trim() || undefined,
      status,
    };

    try {
      const result = await onSubmit(input);
      if (!result.success) {
        setError(result.error ?? "Could not save driver.");
        if (result.issues) setFieldErrors(result.issues);
      }
      // Parent closes modal on success (and may show credentials dialog)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const fieldErr = (key: string) =>
    fieldErrors[key]?.[0] ? (
      <p className="text-[10px] text-red-600 mt-1">{fieldErrors[key][0]}</p>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
            {mode === "create" ? "Register Driver" : "Edit Driver"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Identity */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Identity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Full name *
                </label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                  placeholder="e.g. Sipho Dlamini"
                />
                {fieldErr("fullName")}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  National ID
                </label>
                <input
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
                  placeholder="13 digits"
                />
                {fieldErr("nationalId")}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Phone *
                </label>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
                  placeholder="e.g. 78653001"
                />
                {fieldErr("phone")}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Date of birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                />
                {fieldErr("dateOfBirth")}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Residential address
                </label>
                <input
                  value={residentialAddress}
                  onChange={(e) => setResidentialAddress(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>

          {/* Licence & PDP */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Licence & PDP
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Licence number
                </label>
                <input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Licence class
                </label>
                <input
                  value={licenseClass}
                  onChange={(e) => setLicenseClass(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                  placeholder="e.g. Code 10 / C1"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  PDP number
                </label>
                <input
                  value={pdpNumber}
                  onChange={(e) => setPdpNumber(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  PDP status
                </label>
                <select
                  value={pdpStatus}
                  onChange={(e) => setPdpStatus(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {PDP_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  PDP issue date
                </label>
                <input
                  type="date"
                  value={pdpIssueDate}
                  onChange={(e) => setPdpIssueDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  PDP expiry date
                </label>
                <input
                  type="date"
                  value={pdpExpiryDate}
                  onChange={(e) => setPdpExpiryDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  PDP issuing authority
                </label>
                <input
                  value={pdpIssuingAuthority}
                  onChange={(e) => setPdpIssuingAuthority(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>

          {/* Emergency & assignment */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Emergency contact & assignment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Emergency contact name
                </label>
                <input
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Emergency contact phone
                </label>
                <input
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Relation
                </label>
                <input
                  value={emergencyContactRelation}
                  onChange={(e) => setEmergencyContactRelation(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                  placeholder="e.g. Spouse, Brother"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Assigned vehicle (reg)
                </label>
                <input
                  value={assignedVehicleReg}
                  onChange={(e) => setAssignedVehicleReg(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
                  placeholder="e.g. JSD 123 A"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {mode === "create" && (
            <p className="text-[11px] text-zinc-500">
              On save, a login username and temporary password will be generated
              and shown once so you can share them with the driver.
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {mode === "create" ? "Register driver" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
