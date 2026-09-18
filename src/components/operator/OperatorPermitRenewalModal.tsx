/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { FleetOperator, OperatorMasterCard, Vehicle, Driver, PermitRenewalRequest, RankNotification } from "../../types";
import { payPermitRenewalWithMasterCard } from "../../utils/operatorCards";
import { X, Award, FileText, CheckCircle2, ShieldCheck, AlertTriangle, Upload, CreditCard, DollarSign } from "lucide-react";

interface OperatorPermitRenewalModalProps {
  operator: FleetOperator;
  masterCard: OperatorMasterCard;
  vehicles: Vehicle[];
  drivers: Driver[];
  selectedVehicleReg?: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onAddNotification?: (notif: Omit<RankNotification, "id" | "timestamp">) => void;
}

export default function OperatorPermitRenewalModal({
  operator,
  masterCard,
  vehicles,
  drivers,
  selectedVehicleReg,
  onClose,
  onSuccess,
  onAddNotification
}: OperatorPermitRenewalModalProps) {
  const [targetReg, setTargetReg] = useState<string>(selectedVehicleReg || vehicles[0]?.registrationNumber || "");
  const [renewalTerm, setRenewalTerm] = useState<{ months: number; fee: number; label: string }>({
    months: 12,
    fee: 450,
    label: "12 Months (Annual Standard) - E450.00"
  });
  const [reason, setReason] = useState<string>("Routine Annual Expiry Renewal");
  const [comments, setComments] = useState<string>("");
  const [payWithMaster, setPayWithMaster] = useState<boolean>(true);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([
    "Roadworthiness_Inspection_COF_2026.pdf",
    "Commercial_Third_Party_Insurance_Schedule.pdf"
  ]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const targetVehicle = vehicles.find((v) => v.registrationNumber === targetReg) || vehicles[0];
  const targetDriver = drivers.find((d) => d.id === targetVehicle?.driverId || d.assignedVehicleReg === targetReg);

  const renewalOptions = [
    { months: 6, fee: 250, label: "6 Months (Seasonal Concession) - E250.00" },
    { months: 12, fee: 450, label: "12 Months (Annual Standard) - E450.00" },
    { months: 24, fee: 850, label: "24 Months (Extended Concession) - E850.00" }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const names: string[] = [];
    for (let i = 0; i < files.length; i++) {
      names.push(files[i].name);
    }
    setAttachedFiles((prev) => Array.from(new Set([...prev, ...names])));
  };

  const handleSubmit = () => {
    setError("");
    if (!targetVehicle) {
      setError("Please select a valid vehicle");
      return;
    }

    if (payWithMaster && masterCard.balanceSZL < renewalTerm.fee) {
      setError(`Insufficient Master Card balance to pay renewal fee. Required: E${renewalTerm.fee.toFixed(2)}, Available: E${masterCard.balanceSZL.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);

    try {
      let masterReceiptRef: string | undefined = undefined;

      // 1. Process payment via Master Card if selected
      if (payWithMaster) {
        const payRes = payPermitRenewalWithMasterCard(
          operator.id,
          targetVehicle.registrationNumber,
          renewalTerm.fee,
          `REN-REQ-${Date.now()}`
        );

        if (!payRes.success) {
          setError(payRes.error || "Failed to process master card payment");
          setIsSubmitting(false);
          return;
        }
        masterReceiptRef = payRes.receiptRef;
      }

      // 2. Create the official PermitRenewalRequest
      const reqId = `REQ-${Math.floor(10000 + Math.random() * 90000)}`;
      const now = new Date();

      const newRequest: PermitRenewalRequest = {
        id: reqId,
        vehicleReg: targetVehicle.registrationNumber,
        fleetId: targetVehicle.fleetNumber || targetVehicle.vic || "KF-00",
        currentPermitNumber: targetVehicle.permitNumber || "PRM-SZ-8921",
        currentExpiryDate: targetVehicle.permitExpiryDate || targetVehicle.insuranceExpiry || "2026-10-15",
        operator: operator.name,
        driver: targetDriver?.fullName || "Unassigned",
        reasonForRenewal: `${reason} (${renewalTerm.months} Months)`,
        comments: comments ? `${comments}${masterReceiptRef ? ` [Master Card Paid: ${masterReceiptRef}]` : ""}` : `Operator ${operator.name} submitted renewal request.${masterReceiptRef ? ` [Master Card Paid: ${masterReceiptRef}]` : ""}`,
        supportingDocuments: attachedFiles,
        status: "Pending Admin Approval",
        timestamp: now.toISOString(),
        requestDate: now.toISOString().split("T")[0],
        operatorLicenseNumber: operator.operatorLicenseNumber || "OP-LIC-2026",
        paidWithMasterCard: payWithMaster,
        masterPaymentRef: masterReceiptRef,
        renewalFeeAmountSZL: renewalTerm.fee
      };

      // 3. Persist to localStorage (matching FleetManagerTab storage key)
      const existingRaw = localStorage.getItem("kombiflow_permit_renewal_requests");
      const existingReqs: PermitRenewalRequest[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updatedReqs = [newRequest, ...existingReqs];
      localStorage.setItem("kombiflow_permit_renewal_requests", JSON.stringify(updatedReqs));

      // Trigger custom storage sync event for open tabs
      window.dispatchEvent(new CustomEvent("sisonkhe_permit_renewal_created", { detail: newRequest }));

      // 4. Send Multi-channel notification to Rank Admin & Super Admin
      if (onAddNotification) {
        onAddNotification({
          type: "WhatsApp",
          recipientName: "Rank Licensing Authority",
          recipientPhone: "+268 7604 1122",
          message: `📋 New Permit Renewal Request ${reqId} for ${targetVehicle.registrationNumber} submitted by Operator ${operator.name}.${payWithMaster ? ` Fee Paid via Master Card: E${renewalTerm.fee.toFixed(2)} (Ref: ${masterReceiptRef})` : ""}`,
          status: "Sent"
        });

        onAddNotification({
          type: "SMS",
          recipientName: operator.name,
          recipientPhone: operator.phone,
          message: `Sisonkhe In Transit: Renewal request ${reqId} for ${targetVehicle.registrationNumber} submitted. Status: Pending Admin Approval.${payWithMaster ? ` Fee E${renewalTerm.fee.toFixed(2)} paid from Master Card.` : ""}`,
          status: "Delivered"
        });
      }

      onSuccess(`Permit renewal request submitted for ${targetVehicle.registrationNumber}!${payWithMaster ? ` Fee E${renewalTerm.fee.toFixed(2)} debited from Master Card.` : ""}`);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to submit renewal request");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-5 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white font-space">
                Request Fleet Permit Renewal
              </h2>
              <p className="text-xs text-zinc-500">
                Official NRTC Road Transportation Service Permit Application
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono flex-1">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Vehicle Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block font-sans">
              1. Vehicle to Renew
            </label>
            <select
              value={targetReg}
              onChange={(e) => setTargetReg(e.target.value)}
              className="w-full bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded-xl p-2.5 font-bold text-zinc-900 dark:text-white text-xs cursor-pointer focus:ring-2 focus:ring-blue-500"
            >
              {vehicles.map((v) => (
                <option key={v.registrationNumber} value={v.registrationNumber}>
                  {v.registrationNumber} • {v.fleetNumber || v.vic} — Current Permit: {v.permitNumber || "Active"} (Exp: {v.permitExpiryDate || v.insuranceExpiry || "2026-10"})
                </option>
              ))}
            </select>
          </div>

          {/* Current Permit Details Card */}
          {targetVehicle && (
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-500 font-sans">Current Permit Number:</span>
                <span className="font-bold font-mono text-zinc-900 dark:text-white">
                  {targetVehicle.permitNumber || "PRM-SZ-8921-HHO"}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-500 font-sans">Current Expiry Date:</span>
                <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
                  {targetVehicle.permitExpiryDate || targetVehicle.insuranceExpiry || "2026-09-20"}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-500 font-sans">Registered Operator:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {operator.name} ({operator.companyName})
                </span>
              </div>
            </div>
          )}

          {/* Renewal Term & Fee */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block font-sans">
              2. Renewal Term & Prescribed Fee
            </label>
            <div className="space-y-1.5">
              {renewalOptions.map((opt) => (
                <div
                  key={opt.months}
                  onClick={() => setRenewalTerm(opt)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all font-sans ${
                    renewalTerm.months === opt.months
                      ? "bg-blue-500/10 border-blue-500 text-blue-900 dark:text-blue-300"
                      : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-500" />
                    <div>
                      <span className="font-bold text-xs block">{opt.months} Months Concession</span>
                      <span className="text-[10px] text-zinc-400">Official National Council Tariff</span>
                    </div>
                  </div>
                  <span className="font-bold font-mono text-xs text-blue-600 dark:text-blue-400">
                    E{opt.fee.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reason for renewal */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block font-sans">
              3. Reason for Renewal
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded-xl p-2 font-bold text-zinc-900 dark:text-white text-xs cursor-pointer"
            >
              <option value="Routine Annual Expiry Renewal">Routine Annual Expiry Renewal</option>
              <option value="Permit Expired / Lapsed Renewal">Permit Expired / Lapsed Renewal</option>
              <option value="Replacement of Worn/Damaged Physical Disk">Replacement of Worn/Damaged Physical Disk</option>
              <option value="Corridor Route Concession Extension">Corridor Route Concession Extension</option>
              <option value="Fleet Expansion Authorization">Fleet Expansion Authorization</option>
            </select>
          </div>

          {/* Supporting Documents Upload */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-sans">
                4. Supporting Documents
              </label>
              <label className="text-[10px] text-blue-600 hover:text-blue-700 font-sans font-bold cursor-pointer flex items-center gap-1">
                <Upload className="w-3 h-3" />
                <span>Upload PDF / Image</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-1 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
              {attachedFiles.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] text-zinc-700 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    <span className="truncate">{f}</span>
                  </div>
                  <span className="text-[9px] text-emerald-600 font-bold">Attached</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optional comments */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-500 font-sans">
              Special Instructions / Notes for Administrator:
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Please expedite before month end; kombi operates busy Mbabane-Manzini corridor"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs"
            />
          </div>

          {/* Pay with Master Card Option */}
          <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/40 rounded-xl space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={payWithMaster}
                onChange={(e) => setPayWithMaster(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4 mt-0.5"
              />
              <div className="flex-1 font-sans">
                <span className="font-bold text-zinc-900 dark:text-white text-xs block">
                  Pay E{renewalTerm.fee.toFixed(2)} Fee Now with Operator Master Card
                </span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">
                  Direct debit from {masterCard.cardNumber} &bull; Available balance: E{masterCard.balanceSZL.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-zinc-150 dark:border-zinc-800 flex items-center justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-800/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Submitting Renewal...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Renewal Request {payWithMaster ? `(E${renewalTerm.fee.toFixed(2)})` : ""}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
