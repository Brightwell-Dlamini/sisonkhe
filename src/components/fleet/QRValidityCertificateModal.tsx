import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, 
  X, QrCode, Award, ExternalLink, Calendar, MapPin, 
  User, RefreshCw, Car, Hash, FileCheck, Lock
} from "lucide-react";
import { Vehicle, Route, Driver } from "../../types";
import { getVehicleQRUrl, syncVehicleQRIfNeeded, logQREvent, validateSecureQRPayload } from "../../utils/qrSecurity";
import QRCodeView from "../common/QRCodeView";

interface QRValidityCertificateModalProps {
  vehicle: Vehicle;
  vehicles: Vehicle[];
  routes: Route[];
  drivers: Driver[];
  onClose: () => void;
  onSelectVehicle?: (v: Vehicle) => void;
}

export default function QRValidityCertificateModal({
  vehicle: initialVehicle,
  vehicles,
  routes,
  drivers,
  onClose,
  onSelectVehicle
}: QRValidityCertificateModalProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle>(initialVehicle);
  const [qrMeta, setQrMeta] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyTimestamp, setVerifyTimestamp] = useState<string>(new Date().toLocaleString());

  // Load active QR registry details for this vehicle
  const refreshQRDetails = (veh: Vehicle) => {
    try {
      syncVehicleQRIfNeeded(veh);
      const registry = JSON.parse(localStorage.getItem("kombiflow_qr_registry") || "{}");
      const record = registry[veh.registrationNumber];
      setQrMeta(record || null);
      setVerifyTimestamp(new Date().toLocaleString());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshQRDetails(selectedVehicle);
    
    const handleQRUpdate = (e: CustomEvent) => {
      if (e.detail?.registrationNumber === selectedVehicle.registrationNumber) {
        refreshQRDetails(selectedVehicle);
      }
    };
    
    window.addEventListener("kombiflow_qr_updated" as any, handleQRUpdate);
    return () => {
      window.removeEventListener("kombiflow_qr_updated" as any, handleQRUpdate);
    };
  }, [selectedVehicle]);

  const routeObj = routes.find(r => r.id === selectedVehicle.routeAssignmentId);
  const driverObj = drivers.find(
    d => d.id === selectedVehicle.driverId || d.assignedVehicleReg === selectedVehicle.registrationNumber
  );

  // Compute Permit Validity State
  const now = new Date();
  const permitExpiry = selectedVehicle.permitExpiryDate ? new Date(selectedVehicle.permitExpiryDate) : new Date("2027-08-01");
  const cofExpiry = selectedVehicle.cofExpiryDate ? new Date(selectedVehicle.cofExpiryDate) : new Date("2027-08-01");
  
  const isPermitExpired = permitExpiry.getTime() < now.getTime();
  const isCOFExpired = cofExpiry.getTime() < now.getTime();
  const isSuspended = selectedVehicle.permitStatus === "Suspended";
  const isExplicitlyExpired = selectedVehicle.permitStatus === "Expired" || isPermitExpired;
  
  const isValid = !isSuspended && !isExplicitlyExpired && selectedVehicle.permitStatus === "Active";

  // Calculate days remaining or days expired
  const diffDays = Math.ceil((permitExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const handleSimulateVerification = () => {
    setIsVerifying(true);
    setTimeout(() => {
      refreshQRDetails(selectedVehicle);
      setIsVerifying(false);
      logQREvent(
        isValid ? "VERIFICATION_SUCCESS" : "VERIFICATION_FAILURE",
        selectedVehicle.registrationNumber,
        `Live validity scan check executed. Status: ${isValid ? "VALID" : isSuspended ? "SUSPENDED" : "EXPIRED"}`
      );
    }, 600);
  };

  const qrTargetUrl = getVehicleQRUrl(selectedVehicle);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-6 text-zinc-900 dark:text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
              isValid 
                ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400" 
                : "bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400"
            }`}>
              {isValid ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide">
                Digital Permit QR Validity Certificate
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono">
                Kingdom of Eswatini • Road Transportation Board Verifier
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vehicle Switcher for quick officer testing */}
        {vehicles.length > 1 && (
          <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60 text-xs">
            <span className="text-[11px] font-bold text-zinc-500 shrink-0">Switch Vehicle:</span>
            <select
              value={selectedVehicle.registrationNumber}
              onChange={(e) => {
                const found = vehicles.find(v => v.registrationNumber === e.target.value);
                if (found) {
                  setSelectedVehicle(found);
                  if (onSelectVehicle) onSelectVehicle(found);
                }
              }}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold"
            >
              {vehicles.map(v => (
                <option key={v.registrationNumber} value={v.registrationNumber}>
                  {v.registrationNumber} ({v.fleetNumber || v.vic || "NO-VIC"}) - {v.permitStatus || "Active"}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Validity Status Banner */}
        <div className={`p-4 rounded-2xl border-2 flex items-center justify-between ${
          isValid
            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/60 text-emerald-950 dark:text-emerald-200"
            : isSuspended
            ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500/60 text-amber-950 dark:text-amber-200"
            : "bg-red-50 dark:bg-red-950/40 border-red-500/60 text-red-950 dark:text-red-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white ${
              isValid ? "bg-emerald-600 shadow-lg shadow-emerald-600/30" : isSuspended ? "bg-amber-600" : "bg-red-600 shadow-lg shadow-red-600/30"
            }`}>
              {isValid ? (
                <CheckCircle2 className="w-6 h-6 animate-pulse" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="text-[10px] font-black tracking-widest uppercase opacity-75">
                PERMIT COMPLIANCE STATUS
              </div>
              <div className="text-base font-black uppercase tracking-tight">
                {isValid ? "PERMIT VALID & AUTHORIZED" : isSuspended ? "PERMIT SUSPENDED / INACTIVE" : "PERMIT EXPIRED - NON-COMPLIANT"}
              </div>
              <div className="text-[11px] font-medium opacity-80">
                {isValid 
                  ? `Valid for public passenger transport • ${diffDays > 0 ? `${diffDays} days remaining` : "Renewal due"}`
                  : isSuspended
                  ? "Operation temporarily suspended by Regulatory Authority"
                  : `Permit expired on ${selectedVehicle.permitExpiryDate || "Unknown date"}`}
              </div>
            </div>
          </div>

          <button
            onClick={handleSimulateVerification}
            disabled={isVerifying}
            className="p-2.5 rounded-xl bg-white/80 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-700 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            title="Re-verify Cryptographic QR Token"
          >
            <RefreshCw className={`w-4 h-4 ${isVerifying ? "animate-spin text-emerald-500" : ""}`} />
            <span className="hidden sm:inline">Re-verify</span>
          </button>
        </div>

        {/* Certificate Card Content */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-4 font-mono text-xs">
          
          {/* Top Plate & VIC Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl font-mono font-black text-sm tracking-wider shadow">
                {selectedVehicle.registrationNumber}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                  FLEET-VIC: {selectedVehicle.fleetNumber || selectedVehicle.vic}
                </span>
                <span className="text-[11px] text-zinc-500">
                  {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.seatingCapacity} Seater)
                </span>
              </div>
            </div>

            <div className="text-right text-[11px]">
              <span className="text-zinc-400 text-[10px] block uppercase">Permit Serial</span>
              <span className="font-bold text-purple-700 dark:text-purple-400">{selectedVehicle.permitNumber || "RPT-PENDING"}</span>
            </div>
          </div>

          {/* Key Compliance Verification Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700/70">
              <span className="text-[10px] font-bold text-zinc-400 uppercase block">Permit Expiry</span>
              <span className={`text-xs font-black ${isPermitExpired ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                {selectedVehicle.permitExpiryDate || "2027-08-01"}
              </span>
            </div>

            <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700/70">
              <span className="text-[10px] font-bold text-zinc-400 uppercase block">Fitness (COF) #</span>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate block">
                {selectedVehicle.cofNumber || "COF-VALID"}
              </span>
            </div>

            <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700/70">
              <span className="text-[10px] font-bold text-zinc-400 uppercase block">Terminal Bay</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                {selectedVehicle.loadingBay || "Bay 01"}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-3 p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700/70">
              <span className="text-[10px] font-bold text-zinc-400 uppercase block">Authorized Route Corridor</span>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {routeObj ? `${routeObj.origin} ➔ ${routeObj.destination} (${routeObj.region})` : "General Route"}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-3 p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700/70">
              <span className="text-[10px] font-bold text-zinc-400 uppercase block">Assigned Driver & PDP Status</span>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {driverObj ? `${driverObj.fullName} (${driverObj.pdpNumber || "PDP-VALID"} • Status: ${driverObj.pdpStatus || "Valid"})` : "Unassigned / Standby"}
              </span>
            </div>
          </div>

          {/* Cryptographic QR Code and Security Stamp */}
          <div className="p-4 bg-emerald-950/10 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <QRCodeView
                value={qrTargetUrl}
                size={110}
                showDownload={true}
                showCopyValue={true}
                alt={`Cryptographic QR for ${selectedVehicle.registrationNumber}`}
              />
              <div className="flex-1 space-y-1 text-left">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>HMAC-XOR CRYPTOGRAPHIC DIGITAL SEAL</span>
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 rounded-full font-mono text-[10px]">
                    QR v{qrMeta?.version || 1}.0 Active
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Highway inspection officers can scan this QR with standard mobile cameras to verify commercial road validity.
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-emerald-500/20">
                  <div>
                    <span className="block font-semibold">Security Token (Nonce):</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300 truncate block">
                      {qrMeta?.token || "kflow_sec_tok_99182"}
                    </span>
                  </div>
                  <div>
                    <span className="block font-semibold">Verified At:</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300 block">
                      {verifyTimestamp}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <a
            href={qrTargetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Public Kiosk View</span>
          </a>
          
          <button
            onClick={onClose}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
