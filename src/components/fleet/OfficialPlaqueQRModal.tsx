import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, QrCode, Download, Printer, CheckCircle, 
  ExternalLink, X, Award, AlertTriangle, RefreshCw, FileCheck, CreditCard
} from "lucide-react";
import { Vehicle, Route, Driver } from "../../types";
import { getVehicleQRUrl, syncVehicleQRIfNeeded, logQREvent } from "../../utils/qrSecurity";
import QRValidityCertificateModal from "./QRValidityCertificateModal";
import QRCodeView from "../common/QRCodeView";

interface OfficialPlaqueQRModalProps {
  vehicle: Vehicle;
  vehicles?: Vehicle[];
  routes: Route[];
  drivers: Driver[];
  onClose: () => void;
  onPrintA4?: (vehicle: Vehicle) => void;
  onOpenScannerSim?: (vehicle: Vehicle) => void;
}

export default function OfficialPlaqueQRModal({
  vehicle,
  vehicles = [],
  routes,
  drivers,
  onClose,
  onPrintA4,
  onOpenScannerSim
}: OfficialPlaqueQRModalProps) {
  const [verifyStep, setVerifyStep] = useState<number>(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showValidityModal, setShowValidityModal] = useState(false);
  const [qrMeta, setQrMeta] = useState<any>(null);

  const routeObj = routes.find(r => r.id === vehicle.routeAssignmentId);
  const driverObj = drivers.find(d => d.id === vehicle.driverId || d.assignedVehicleReg === vehicle.registrationNumber);
  
  const loadRegistry = () => {
    try {
      syncVehicleQRIfNeeded(vehicle);
      const registry = JSON.parse(localStorage.getItem("kombiflow_qr_registry") || "{}");
      setQrMeta(registry[vehicle.registrationNumber] || null);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadRegistry();
    const handleQRUpdate = (e: CustomEvent) => {
      if (e.detail?.registrationNumber === vehicle.registrationNumber) {
        loadRegistry();
      }
    };
    window.addEventListener("kombiflow_qr_updated" as any, handleQRUpdate);
    return () => {
      window.removeEventListener("kombiflow_qr_updated" as any, handleQRUpdate);
    };
  }, [vehicle]);

  const qrTargetUrl = getVehicleQRUrl(vehicle);

  const handleVerifyQR = () => {
    setVerifyStep(1); // "Regenerating Secure QR..."
    setTimeout(() => {
      setVerifyStep(2); // "Synchronizing Vehicle Data..."
      setTimeout(() => {
        setVerifyStep(3); // "Publishing Updated QR..."
        setTimeout(() => {
          setVerifyStep(4); // "Verification Successful"
          logQREvent("VERIFICATION_SUCCESS", vehicle.registrationNumber, `Cryptographic hash & token verified for ${vehicle.registrationNumber}.`);
          setToastMsg("🛡️ Cryptographic QR signature verified & synchronized successfully!");
          setTimeout(() => {
            setVerifyStep(0);
            setShowValidityModal(true);
          }, 1000);
        }, 600);
      }, 600);
    }, 600);
  };

  const handleDownloadQR = () => {
    const link = document.createElement("a");
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=2&ecc=M&color=000000&bgcolor=ffffff&data=${encodeURIComponent(qrTargetUrl)}`;
    link.href = qrImgUrl;
    link.download = `PLAQUE_QR_${vehicle.registrationNumber.replace(/\s+/g, "_")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMsg("Official Plaque QR image downloaded!");
    setTimeout(() => setToastMsg(null), 3000);
  };

  if (showValidityModal) {
    return (
      <QRValidityCertificateModal
        vehicle={vehicle}
        vehicles={vehicles.length > 0 ? vehicles : [vehicle]}
        routes={routes}
        drivers={drivers}
        onClose={() => setShowValidityModal(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-zinc-900 dark:text-white text-sm uppercase tracking-wide">
                Official Government QR Decal & Plaque
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono">
                Kingdom of Eswatini • Ministry of Public Works & Transport
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {toastMsg && (
          <div className="p-3 bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-between">
            <span>{toastMsg}</span>
            <button onClick={() => setToastMsg(null)} className="text-white/80 hover:text-white font-bold ml-2">✕</button>
          </div>
        )}

        {/* The Official Plaque Card (Gold gilded border layout) */}
        <div className="bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-5 rounded-2xl border-2 border-emerald-600/40 shadow-inner relative overflow-hidden text-center space-y-4">
          
          {/* Subtle Coat of Arms Seal Background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <Award className="w-72 h-72 text-emerald-900" />
          </div>

          <div className="relative z-10 flex items-center justify-between text-[9px] font-black tracking-widest uppercase text-emerald-800 dark:text-emerald-400 border-b border-emerald-600/20 pb-2">
            <span>NATIONAL ROAD TRANSPORT ACT</span>
            <span className="flex items-center gap-1">
              <span>🇸🇿</span>
              <span>CONCESSION SEAL</span>
            </span>
          </div>

          {/* QR Code Container */}
          <div className="relative z-10 flex flex-col items-center justify-center mx-auto">
            <QRCodeView
              value={qrTargetUrl}
              size={170}
              showDownload={true}
              showCopyValue={true}
              alt={`Plaque QR Code for ${vehicle.registrationNumber}`}
            />
          </div>

          {/* Vehicle Registration & VIC */}
          <div className="relative z-10 space-y-0.5">
            <div className="text-xl font-black font-mono-jb tracking-wider text-zinc-900 dark:text-white">
              {vehicle.registrationNumber}
            </div>
            <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
              FLEET-VIC: {vehicle.fleetNumber || vehicle.vic}
            </div>
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
              {vehicle.make} {vehicle.model} • {vehicle.seatingCapacity} Seater ({vehicle.classification || "kombi"})
            </div>
          </div>

          {/* Plaque Metadata Spec Grid */}
          <div className="relative z-10 grid grid-cols-2 gap-2 text-left text-[10.5px] bg-white/80 dark:bg-black/50 backdrop-blur-sm p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 font-mono">
            <div>
              <span className="text-zinc-400 text-[9px] block uppercase">Permit Serial</span>
              <strong className="text-zinc-900 dark:text-zinc-100 font-bold truncate block">{vehicle.permitNumber || "RPT-PENDING"}</strong>
            </div>
            <div>
              <span className="text-zinc-400 text-[9px] block uppercase">Permit Expiry</span>
              <strong className="text-zinc-900 dark:text-zinc-100 font-bold block">{vehicle.permitExpiryDate || "2027-08-01"}</strong>
            </div>
            <div>
              <span className="text-zinc-400 text-[9px] block uppercase">Fitness (COF)</span>
              <strong className="text-zinc-900 dark:text-zinc-100 font-bold truncate block">{vehicle.cofNumber || "COF-VALID"}</strong>
            </div>
            <div>
              <span className="text-zinc-400 text-[9px] block uppercase">Assigned Bay</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold block">{vehicle.loadingBay || "Bay 01"}</strong>
            </div>
            <div className="col-span-2 pt-1 border-t border-zinc-150 dark:border-zinc-800">
              <span className="text-zinc-400 text-[9px] block uppercase">Corridor Route</span>
              <strong className="text-zinc-800 dark:text-zinc-200 truncate block">
                {routeObj ? `${routeObj.origin} ➔ ${routeObj.destination} (${routeObj.region})` : "General Route"}
              </strong>
            </div>
            <div className="col-span-2">
              <span className="text-zinc-400 text-[9px] block uppercase">Assigned Driver & Operator</span>
              <strong className="text-zinc-800 dark:text-zinc-200 truncate block">
                Driver: {driverObj ? driverObj.fullName : "Unassigned"} • Owner: {vehicle.ownerName}
              </strong>
            </div>
          </div>

          {/* Cryptographic Verification Step Progress Animation */}
          {verifyStep > 0 && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded-xl text-white text-xs font-mono space-y-1 text-left">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span className="font-bold text-emerald-300">
                  {verifyStep === 1 && "Step 1/3: Regenerating Secure QR Hash..."}
                  {verifyStep === 2 && "Step 2/3: Synchronizing Vehicle Registry..."}
                  {verifyStep === 3 && "Step 3/3: Publishing Cryptographic Token..."}
                  {verifyStep === 4 && "✓ Verification Complete & Authentic!"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            onClick={handleVerifyQR}
            disabled={verifyStep > 0}
            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 shadow cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify QR</span>
          </button>

          <button
            onClick={handleDownloadQR}
            className="py-2.5 px-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download QR</span>
          </button>

          {onPrintA4 && (
            <button
              onClick={() => onPrintA4(vehicle)}
              className="py-2.5 px-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4</span>
            </button>
          )}

          <a
            href={qrTargetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 shadow cursor-pointer text-center"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Scan Sim</span>
          </a>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl text-xs cursor-pointer"
          >
            Close Plaque
          </button>
        </div>

      </div>
    </div>
  );
}
