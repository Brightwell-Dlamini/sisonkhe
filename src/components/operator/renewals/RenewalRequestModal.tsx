/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useEffect, useState } from "react";
import { Loader2, X, AlertCircle, CreditCard, Upload } from "lucide-react";
import { RENEWAL_TERMS } from "@/lib/renewals/validation";

interface Props {
  operatorId: string;
  operatorName: string;
  onClose: () => void;
  onSubmit: (input: {
    vehicleReg: string;
    termMonths: number;
    reason: string;
    comments?: string;
    supportingDocuments?: string[];
    payWithMasterCard?: boolean;
    operatorLicenseNumber?: string;
    odometerReading?: number;
    yearOfManufacture?: number;
    insurancePolicy?: string;
    concessionId?: string;
  }) => Promise<{ success: boolean; error?: string; issues?: Record<string, string[]> }>;
}

interface VehicleOption {
  registrationNumber: string;
  vic: string | null;
  permitNumber: string | null;
  permitExpiryDate: string | null;
}

export default function RenewalRequestModal({
  operatorId,
  onClose,
  onSubmit,
}: Props) {
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehicleReg, setVehicleReg] = useState("");
  const [termMonths, setTermMonths] = useState<number>(12);
  const [reason, setReason] = useState("Routine annual renewal");
  const [comments, setComments] = useState("");
  const [supportingDocuments, setSupportingDocuments] = useState<string[]>([]);
  const [payWithMasterCard, setPayWithMasterCard] = useState(true);
  const [operatorLicenseNumber, setOperatorLicenseNumber] = useState("");
  const [odometerReading, setOdometerReading] = useState<string>("");
  const [yearOfManufacture, setYearOfManufacture] = useState<string>("");
  const [insurancePolicy, setInsurancePolicy] = useState("");
  const [concessionId, setConcessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load operator's vehicles
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/vehicles", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load vehicles");
        const data = await res.json();
        const list: VehicleOption[] = (data.vehicles ?? [])
          .filter((v: any) => v.ownerOperatorId === operatorId)
          .map((v: any) => ({
            registrationNumber: v.registrationNumber,
            vic: v.vic,
            permitNumber: v.permitNumber,
            permitExpiryDate: v.permitExpiryDate,
          }));
        setVehicles(list);
        if (list.length > 0) setVehicleReg(list[0].registrationNumber);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoadingVehicles(false);
      }
    };
    void load();
  }, [operatorId]);

  const selectedVehicle = vehicles.find(
    (v) => v.registrationNumber === vehicleReg
  );
  const selectedTerm = RENEWAL_TERMS.find((t) => t.months === termMonths);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const names: string[] = [];
    for (let i = 0; i < files.length; i++) names.push(files[i].name);
    setSupportingDocuments((prev) =>
      Array.from(new Set([...prev, ...names])).slice(0, 10)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!vehicleReg) {
      setError("Select a vehicle.");
      return;
    }
    setLoading(true);

    const result = await onSubmit({
      vehicleReg,
      termMonths,
      reason,
      comments: comments || undefined,
      supportingDocuments: supportingDocuments.length > 0 ? supportingDocuments : undefined,
      payWithMasterCard,
      operatorLicenseNumber: operatorLicenseNumber || undefined,
      odometerReading: odometerReading ? Number(odometerReading) : undefined,
      yearOfManufacture: yearOfManufacture ? Number(yearOfManufacture) : undefined,
      insurancePolicy: insurancePolicy || undefined,
      concessionId: concessionId || undefined,
    });

    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Submission failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 flex items-start justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-zinc-900 dark:text-white">
              Request Permit Renewal
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              NRTC Road Transportation Permit Application
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Vehicle */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Vehicle *
            </label>
            {loadingVehicles ? (
              <div className="text-xs text-zinc-500">Loading vehicles…</div>
            ) : vehicles.length === 0 ? (
              <div className="text-xs text-red-600">
                No vehicles registered to your account.
              </div>
            ) : (
              <select
                value={vehicleReg}
                onChange={(e) => setVehicleReg(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-zinc-900 dark:text-white"
              >
                {vehicles.map((v) => (
                  <option key={v.registrationNumber} value={v.registrationNumber}>
                    {v.registrationNumber} {v.vic ? `(${v.vic})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedVehicle && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Current permit:</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-white">
                  {selectedVehicle.permitNumber ?? "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Expires:</span>
                <span className="font-mono text-amber-600 dark:text-amber-400">
                  {selectedVehicle.permitExpiryDate ?? "—"}
                </span>
              </div>
            </div>
          )}

          {/* Term */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Renewal Term *
            </label>
            <div className="space-y-2">
              {RENEWAL_TERMS.map((t) => (
                <label
                  key={t.months}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                    termMonths === t.months
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={termMonths === t.months}
                      onChange={() => setTermMonths(t.months)}
                      className="text-amber-600"
                    />
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {t.label}
                    </span>
                  </div>
                  <span className="font-mono font-black text-amber-700 dark:text-amber-400">
                    E {t.feeSzl.toFixed(2)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white"
            >
              <option>Routine annual renewal</option>
              <option>Permit already expired</option>
              <option>Replacement of damaged certificate</option>
              <option>Corridor route extension</option>
              <option>Fleet expansion authorization</option>
            </select>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Comments
            </label>
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Any additional context for the reviewing officer…"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white resize-none"
            />
          </div>

          {/* Optional detailed fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                Operator License #
              </label>
              <input
                type="text"
                value={operatorLicenseNumber}
                onChange={(e) => setOperatorLicenseNumber(e.target.value)}
                placeholder="OP-HHO-2024-0012"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                Concession ID
              </label>
              <input
                type="text"
                value={concessionId}
                onChange={(e) => setConcessionId(e.target.value)}
                placeholder="CNC-SZ-402"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                Odometer Reading (km)
              </label>
              <input
                type="number"
                value={odometerReading}
                onChange={(e) => setOdometerReading(e.target.value)}
                placeholder="124500"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                Year of Manufacture
              </label>
              <input
                type="number"
                value={yearOfManufacture}
                onChange={(e) => setYearOfManufacture(e.target.value)}
                placeholder="2018"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                Insurance Policy Provider
              </label>
              <input
                type="text"
                value={insurancePolicy}
                onChange={(e) => setInsurancePolicy(e.target.value)}
                placeholder="e.g. Swaziland Royal Insurance — SR-FLT-2911"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white"
              />
            </div>
          </div>

          {/* File upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase text-zinc-500">
                Supporting Documents
              </label>
              <label className="text-[10px] text-amber-600 hover:text-amber-700 font-bold cursor-pointer flex items-center gap-1">
                <Upload className="w-3 h-3" />
                <span>Upload</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
              {supportingDocuments.length === 0 ? (
                <div className="text-[11px] text-zinc-400">
                  No files attached. Optional.
                </div>
              ) : (
                <div className="space-y-1">
                  {supportingDocuments.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-[11px] text-zinc-700 dark:text-zinc-300 font-mono"
                    >
                      <span className="truncate">📄 {f}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSupportingDocuments((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pay with Master Card */}
          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 cursor-pointer">
            <input
              type="checkbox"
              checked={payWithMasterCard}
              onChange={(e) => setPayWithMasterCard(e.target.checked)}
              className="mt-0.5 text-amber-600"
            />
            <div className="text-xs flex-1">
              <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5" />
                Pay E {selectedTerm?.feeSzl.toFixed(2) ?? "0.00"} now with
                Operator Master Card
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                Deducted from your master balance immediately. If declined by
                the reviewer, the fee will be refunded.
              </div>
            </div>
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !vehicleReg}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Submit Renewal Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
