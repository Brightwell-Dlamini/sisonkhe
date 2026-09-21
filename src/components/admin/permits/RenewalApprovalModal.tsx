/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Loader2, X, CheckCircle2, XCircle, FileText } from "lucide-react";
import type { RenewalRow } from "@/lib/renewals/queries";

interface Props {
  renewal: RenewalRow;
  readOnly: boolean;
  onClose: () => void;
  onSubmit: (input: {
    decision: "Approved" | "Rejected";
    newPermitNumber?: string;
    permitIssueDate?: string;
    permitExpiryDate?: string;
    cofNumber?: string;
    cofIssueDate?: string;
    cofExpiryDate?: string;
    inspectionDate?: string;
    licensingOffice?: string;
    renewalNotes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const OFFICES = [
  "Mbabane Licensing Office",
  "Manzini Licensing Office",
  "Piggs Peak Licensing Office",
  "Nhlangano Licensing Office",
  "Siteki Licensing Office",
];

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function inYears(n: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + n);
  return d.toISOString().split("T")[0];
}

export default function RenewalApprovalModal({
  renewal,
  readOnly,
  onClose,
  onSubmit,
}: Props) {
  const [decision, setDecision] = useState<"Approved" | "Rejected">("Approved");
  const [newPermitNumber, setNewPermitNumber] = useState(
    renewal.currentPermitNumber
      ? `${renewal.currentPermitNumber}-R`
      : `RPT-${renewal.vehicleReg.replace(/\s+/g, "")}`
  );
  const [permitIssueDate, setPermitIssueDate] = useState(today());
  const [permitExpiryDate, setPermitExpiryDate] = useState(inYears(1));
  const [cofNumber, setCofNumber] = useState("");
  const [cofIssueDate, setCofIssueDate] = useState(today());
  const [cofExpiryDate, setCofExpiryDate] = useState(inYears(1));
  const [inspectionDate, setInspectionDate] = useState(today());
  const [licensingOffice, setLicensingOffice] = useState(OFFICES[0]);
  const [renewalNotes, setRenewalNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const input: Parameters<typeof onSubmit>[0] = { decision, renewalNotes: renewalNotes || undefined };

    if (decision === "Approved") {
      input.newPermitNumber = newPermitNumber;
      input.permitIssueDate = permitIssueDate;
      input.permitExpiryDate = permitExpiryDate;
      input.cofNumber = cofNumber || undefined;
      input.cofIssueDate = cofIssueDate;
      input.cofExpiryDate = cofExpiryDate;
      input.inspectionDate = inspectionDate;
      input.licensingOffice = licensingOffice;
    }

    const result = await onSubmit(input);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Action failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 flex items-start justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-zinc-900 dark:text-white">
              {readOnly ? "Renewal Request" : "Process Renewal"}
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">{renewal.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Request summary */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-500">Vehicle:</span>
              <span className="font-bold text-zinc-900 dark:text-white">
                {renewal.vehicleReg}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Operator:</span>
              <span className="text-zinc-800 dark:text-zinc-200">
                {renewal.operator ?? "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Reason:</span>
              <span className="text-zinc-800 dark:text-zinc-200 text-right">
                {renewal.reasonForRenewal}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Current permit:</span>
              <span className="text-zinc-800 dark:text-zinc-200">
                {renewal.currentPermitNumber ?? "—"}
              </span>
            </div>
            {renewal.renewalFeeAmountSzl !== null && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Fee paid:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  E {renewal.renewalFeeAmountSzl.toFixed(2)} ({renewal.masterPaymentRef ?? "—"})
                </span>
              </div>
            )}
            {renewal.comments && (
              <div className="pt-2 mt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="text-zinc-500 mb-1">Comments:</div>
                <div className="text-zinc-700 dark:text-zinc-300 italic">
                  {renewal.comments}
                </div>
              </div>
            )}
            {renewal.supportingDocuments.length > 0 && (
              <div className="pt-2 mt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="text-zinc-500 mb-1">Documents:</div>
                {renewal.supportingDocuments.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                    <FileText className="w-3 h-3" />
                    <span className="truncate">{d}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {readOnly ? (
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500">Decision:</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {renewal.status}
                </span>
              </div>
              {renewal.newPermitNumber && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">New permit:</span>
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {renewal.newPermitNumber}
                  </span>
                </div>
              )}
              {renewal.approvedBy && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Processed by:</span>
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {renewal.approvedBy} on {renewal.approvalDate}
                  </span>
                </div>
              )}
              {renewal.renewalNotes && (
                <div className="pt-2 mt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="text-zinc-500 mb-1">Notes:</div>
                  <div className="text-zinc-700 dark:text-zinc-300 italic">
                    {renewal.renewalNotes}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-3 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-2">
                  Decision
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-xs font-bold transition-all ${
                      decision === "Approved"
                        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                        : "border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={decision === "Approved"}
                      onChange={() => setDecision("Approved")}
                      className="text-emerald-600"
                    />
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Approve</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-xs font-bold transition-all ${
                      decision === "Rejected"
                        ? "border-red-400 bg-red-50 dark:bg-red-950/40"
                        : "border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={decision === "Rejected"}
                      onChange={() => setDecision("Rejected")}
                      className="text-red-600"
                    />
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>Reject</span>
                  </label>
                </div>
              </div>

              {decision === "Approved" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                        New Permit #
                      </label>
                      <input
                        type="text"
                        required
                        value={newPermitNumber}
                        onChange={(e) => setNewPermitNumber(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                        Issuing Office
                      </label>
                      <select
                        value={licensingOffice}
                        onChange={(e) => setLicensingOffice(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white"
                      >
                        {OFFICES.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                        Permit Issue Date
                      </label>
                      <input
                        type="date"
                        required
                        value={permitIssueDate}
                        onChange={(e) => setPermitIssueDate(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                        Permit Expiry Date
                      </label>
                      <input
                        type="date"
                        required
                        value={permitExpiryDate}
                        onChange={(e) => setPermitExpiryDate(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                        COF #
                      </label>
                      <input
                        type="text"
                        value={cofNumber}
                        onChange={(e) => setCofNumber(e.target.value)}
                        placeholder="COF-XXXX"
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                        COF Expiry
                      </label>
                      <input
                        type="date"
                        value={cofExpiryDate}
                        onChange={(e) => setCofExpiryDate(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                  {decision === "Approved"
                    ? "Approval Notes (optional)"
                    : "Rejection Reason"}
                </label>
                <textarea
                  rows={2}
                  value={renewalNotes}
                  onChange={(e) => setRenewalNotes(e.target.value)}
                  required={decision === "Rejected"}
                  placeholder={
                    decision === "Approved"
                      ? "Any conditions or notes…"
                      : "Why is this being rejected?"
                  }
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white resize-none"
                />
              </div>

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
                  disabled={loading}
                  className={`flex-1 py-2.5 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                    decision === "Approved"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {decision === "Approved" ? "Approve Renewal" : "Reject Renewal"}
                </button>
              </div>
            </form>
          )}

          {readOnly && (
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
