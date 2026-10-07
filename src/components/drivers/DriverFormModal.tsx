/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode = CLAIM-STYLE: national ID + phone → verify portal row → issue login
 *               (+ optional vehicle assign).
 * Edit mode = ops: status, vehicle assignment, profile corrections.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X, AlertCircle, ShieldCheck, KeyRound } from "lucide-react";
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
  onIssuedLogin?: (creds: {
    fullName: string;
    username: string;
    password: string;
  }) => void;
  onRefresh?: () => void;
}

export default function DriverFormModal({
  mode,
  driver,
  onClose,
  onSubmit,
  onIssuedLogin,
  onRefresh,
}: Props) {
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState<{
    driverId: string;
    fullName: string;
    alreadyHasLogin: boolean;
  } | null>(null);
  const [assignReg, setAssignReg] = useState("");
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [stepError, setStepError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const eligibleVehicles = useMemo(() => {
    return filterAssignableVehicles(
      vehicles,
      verified?.driverId ?? driver?.id ?? null,
      assignReg || form.assignedVehicleReg || driver?.assignedVehicleReg
    );
  }, [
    vehicles,
    verified?.driverId,
    driver?.id,
    assignReg,
    form.assignedVehicleReg,
    driver?.assignedVehicleReg,
  ]);

  async function verifyIdentity(e: React.FormEvent) {
    e.preventDefault();
    setStepError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/claim/driver", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalId, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.error?.includes("already been claimed")) {
          setStepError(
            "This driver already has a login. Use Edit on the list to assign a vehicle, or Reset password."
          );
          setBusy(false);
          return;
        }
        setStepError(data.error ?? "Verification failed");
        setBusy(false);
        return;
      }
      setVerified({
        driverId: data.driverId,
        fullName: data.fullName,
        alreadyHasLogin: false,
      });
    } catch {
      setStepError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function issueLoginAndAssign() {
    if (!verified) return;
    setBusy(true);
    setStepError(null);
    try {
      const res = await fetch(
        `/api/admin/drivers/${verified.driverId}/issue-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setStepError(data.error ?? "Could not issue login");
        setBusy(false);
        return;
      }

      if (assignReg) {
        const linkRes = await fetch("/api/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driverId: verified.driverId,
            vehicleReg: assignReg,
            force: true,
          }),
        });
        if (!linkRes.ok) {
          const linkData = await linkRes.json().catch(() => ({}));
          setStepError(
            (linkData as { error?: string }).error ??
              "Login issued, but vehicle link failed. Use Edit to assign."
          );
          onIssuedLogin?.({
            fullName: verified.fullName,
            username: data.credentials.username,
            password: data.credentials.password,
          });
          onRefresh?.();
          setBusy(false);
          return;
        }
      }

      onIssuedLogin?.({
        fullName: verified.fullName,
        username: data.credentials.username,
        password: data.credentials.password,
      });
      onRefresh?.();
      onClose();
    } catch {
      setStepError("Network error");
    } finally {
      setBusy(false);
    }
  }

  const update = <K extends keyof CreateDriverRequest>(
    key: K,
    value: CreateDriverRequest[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await onSubmit(form);
    setLoading(false);
    if (!result.success) setError(result.error ?? "Failed to save");
    else onClose();
  };

  if (mode === "create") {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] overflow-y-auto">
          <div className="flex items-start justify-between p-5 border-b border-white/[0.06]">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                Issue driver login
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Verify National ID + phone from the portal profile, then create
                auth. Do not re-enter demographics.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {stepError && (
              <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-3 text-xs flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {stepError}
              </div>
            )}

            {!verified ? (
              <form onSubmit={verifyIdentity} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                    National ID
                  </label>
                  <input
                    required
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="input font-mono"
                    placeholder="Same ID used on /register/driver"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                    Registered phone
                  </label>
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input font-mono"
                    placeholder="Same phone as portal"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  Verify portal profile
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-xs">
                  <div className="font-bold text-emerald-200">
                    {verified.fullName}
                  </div>
                  <div className="text-emerald-300/80 mt-0.5 font-mono text-[11px]">
                    ID verified · ready to issue login
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                    Assign vehicle (optional)
                  </label>
                  <select
                    value={assignReg}
                    onChange={(e) => setAssignReg(e.target.value)}
                    className="input font-mono"
                  >
                    <option value="">— None now —</option>
                    {eligibleVehicles.map((v) => (
                      <option
                        key={v.registrationNumber}
                        value={v.registrationNumber}
                      >
                        {vehicleOptionLabel(v)}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Only free vehicles. You can assign later via Edit.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void issueLoginAndAssign()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5" />
                  )}
                  Issue login credentials
                </button>
                <button
                  type="button"
                  onClick={() => setVerified(null)}
                  className="w-full py-2 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  ← Verify different person
                </button>
              </div>
            )}
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
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#0F0F10] flex items-start justify-between p-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-white">
              Edit driver
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Ops only: status, vehicle, corrections. Demographics came from the
              portal.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-3 text-xs">
              {error}
            </div>
          )}

          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-xs text-zinc-300">
            <div className="font-bold text-white">{form.fullName}</div>
            <div className="font-mono text-[11px] text-zinc-500 mt-0.5">
              {form.nationalId || "—"} · {form.phone}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Assigned vehicle
            </label>
            <select
              value={form.assignedVehicleReg ?? ""}
              onChange={(e) => update("assignedVehicleReg", e.target.value)}
              className="input font-mono"
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
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Status
            </label>
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
          </div>

          <div className="flex gap-2 pt-2">
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
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </form>

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
    </div>
  );
}
