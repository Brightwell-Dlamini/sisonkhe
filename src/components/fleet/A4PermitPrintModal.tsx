import React from "react";
import { Printer, X, Award, ShieldCheck, CheckCircle } from "lucide-react";
import { Vehicle, Route, Driver } from "../../types";
import SignedQRCode from "@/components/qr/SignedQRCode";

interface A4PermitPrintModalProps {
  vehicle: Vehicle;
  routes: Route[];
  drivers: Driver[];
  onClose: () => void;
}

export default function A4PermitPrintModal({
  vehicle,
  routes,
  drivers,
  onClose
}: A4PermitPrintModalProps) {
  const routeObj = routes.find(r => r.id === vehicle.routeAssignmentId);
  const driverObj = drivers.find(d => d.id === vehicle.driverId || d.assignedVehicleReg === vehicle.registrationNumber);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white text-zinc-900 border border-zinc-300 rounded-3xl max-w-3xl w-full p-8 shadow-2xl space-y-6 my-8 print:shadow-none print:border-none print:p-0 print:m-0">
        
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-sm uppercase tracking-wide">
              Official A4 Road Carrier Permit Document
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
            >
              <Printer className="w-4 h-4" />
              Print Document
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-6 print:space-y-4">
          <div className="text-center space-y-1 border-b-2 border-emerald-700 pb-4">
            <div className="flex justify-center mb-2">
              <Award className="w-12 h-12 text-emerald-700" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-emerald-900">
              Kingdom of Eswatini
            </h1>
            <p className="text-sm font-bold uppercase text-zinc-600">
              Ministry of Public Works & Transport
            </p>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              Road Transportation Board — Carrier Permit
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
            <div>
              <div className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Registration</div>
              <div className="text-xl font-black text-zinc-900">{vehicle.registrationNumber}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">VIC / Fleet ID</div>
              <div className="text-xl font-black text-zinc-900">{vehicle.vic || "—"}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Make / Model</div>
              <div className="text-sm font-bold text-zinc-800">{vehicle.make} {vehicle.model}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Seating</div>
              <div className="text-sm font-bold text-zinc-800">{vehicle.seatingCapacity} passengers</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-[10px] font-bold uppercase text-zinc-400">Authorized Route</div>
                <div className="font-semibold text-zinc-800">
                  {routeObj ? `${routeObj.origin} → ${routeObj.destination}` : vehicle.routeAssignmentId || "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-zinc-400">Assigned Driver</div>
                <div className="font-semibold text-zinc-800">{driverObj?.fullName || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-zinc-400">Permit Status</div>
                <div className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {vehicle.permitStatus || "Active"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-zinc-400">COF Expiry</div>
                <div className="font-semibold text-zinc-800">{vehicle.cofExpiryDate || "—"}</div>
              </div>
              <div className="text-[10px] text-zinc-500 pt-2">
                Human-readable plate and permit number remain authoritative if the QR cannot be read.
              </div>
            </div>

            <div className="flex flex-col items-center justify-center border border-zinc-200 rounded-2xl p-4 bg-zinc-50">
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-800 mb-2">
                OFFICIAL CRYPTOGRAPHIC QR
              </div>
              <SignedQRCode
                registrationNumber={vehicle.registrationNumber}
                size={180}
                showRefreshButton={false}
              />
              <div className="mt-2 text-[9px] text-zinc-500 text-center max-w-[12rem]">
                Signed token · scan to verify live standing
              </div>
              <div className="mt-1 font-mono text-[10px] font-bold text-zinc-800">
                {vehicle.registrationNumber}
                {vehicle.permitNumber ? ` · ${vehicle.permitNumber}` : ""}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-zinc-400 text-center border-t border-zinc-200 pt-3">
            Issued under the Road Transportation Act. Present on demand to authorized officers.
          </div>
        </div>
      </div>
    </div>
  );
}
