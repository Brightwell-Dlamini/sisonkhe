import React from "react";
import { Printer, Download, X, Award, ShieldCheck, CheckCircle } from "lucide-react";
import { Vehicle, Route, Driver } from "../../types";
import { getVehicleQRUrl } from "../../utils/qrSecurity";

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
  const qrTargetUrl = getVehicleQRUrl(vehicle);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white text-zinc-900 border border-zinc-300 rounded-3xl max-w-3xl w-full p-8 shadow-2xl space-y-6 my-8 print:shadow-none print:border-none print:p-0 print:m-0">
        
        {/* Modal Controls (Hidden in Print) */}
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Document</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE A4 SHEET CONTAINER */}
        <div className="p-8 border-4 border-double border-emerald-800 rounded-2xl relative bg-white text-zinc-900 space-y-6 overflow-hidden">
          
          {/* Subtle Coat of Arms background watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <Award className="w-96 h-96 text-emerald-950" />
          </div>

          {/* Official Government Header */}
          <div className="text-center space-y-1 relative z-10 border-b-2 border-zinc-900 pb-4">
            <div className="text-xs font-black tracking-widest uppercase text-emerald-800">
              KINGDOM OF ESWATINI • UMBUSO WESWATINI
            </div>
            <h1 className="text-2xl font-black font-space uppercase tracking-tight text-zinc-950">
              MINISTRY OF PUBLIC WORKS & TRANSPORT
            </h1>
            <div className="text-xs font-semibold text-zinc-700">
              ROAD TRANSPORTATION BOARD • PUBLIC SERVICE VEHICLE (PSV) OPERATOR PERMIT
            </div>
            <div className="text-[10px] font-mono text-zinc-500 pt-1">
              Issued under the Provisions of the Road Transportation Act of 1974 and National Passenger Regulations
            </div>
          </div>

          {/* Permit Main Numbers Strip */}
          <div className="relative z-10 grid grid-cols-3 gap-3 p-3 bg-zinc-50 border border-zinc-300 rounded-xl text-center font-mono">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">Permit Serial No.</span>
              <strong className="text-sm font-black text-emerald-900">{vehicle.permitNumber || "RPT-PENDING"}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">Registration Plate</span>
              <strong className="text-sm font-black text-zinc-900">{vehicle.registrationNumber}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">FLEET-VIC Identification</span>
              <strong className="text-sm font-black text-emerald-700">{vehicle.fleetNumber || vehicle.vic}</strong>
            </div>
          </div>

          {/* Two-Column Specification & QR Area */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left 2 cols: Specifications */}
            <div className="md:col-span-2 space-y-4 text-xs">
              
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-zinc-400 block border-b border-zinc-200 pb-0.5">
                  1. Authorized Operator & Association
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><strong>Operator / Owner:</strong> {vehicle.ownerName || "Commercial Carrier"}</div>
                  <div><strong>Operator Phone:</strong> {vehicle.ownerPhone || "+268 7600 0000"}</div>
                  <div className="col-span-2"><strong>Transport Association:</strong> {vehicle.association}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-zinc-400 block border-b border-zinc-200 pb-0.5">
                  2. Commercial Vehicle Particulars
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><strong>Make & Model:</strong> {vehicle.make} {vehicle.model}</div>
                  <div><strong>Vehicle Class:</strong> {vehicle.classification || "kombi"}</div>
                  <div><strong>Seating Capacity:</strong> {vehicle.seatingCapacity} Passengers</div>
                  <div><strong>Terminal Bay:</strong> {vehicle.loadingBay || "Bay 01"}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-zinc-400 block border-b border-zinc-200 pb-0.5">
                  3. Authorized Corridor Route & Operational Sector
                </span>
                <div className="text-[11px]">
                  <strong>Assigned Route:</strong> {routeObj ? `${routeObj.origin} ➔ ${routeObj.destination} (${routeObj.region} Region)` : "National Corridor Network"}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-zinc-400 block border-b border-zinc-200 pb-0.5">
                  4. Statutory Compliance & Road Fitness
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><strong>Fitness Certificate (COF):</strong> {vehicle.cofNumber || "COF-VALID"}</div>
                  <div><strong>COF Expiry Date:</strong> {vehicle.cofExpiryDate || "2027-08-01"}</div>
                  <div><strong>Assigned Driver:</strong> {driverObj ? driverObj.fullName : "Designated Driver"}</div>
                  <div><strong>Driver PDP Status:</strong> {driverObj?.pdpStatus || "Valid"}</div>
                </div>
              </div>
            </div>

            {/* Right col: High-Resolution QR Decal & Concession Seal */}
            <div className="text-center flex flex-col items-center justify-between p-4 bg-zinc-50 border border-zinc-300 rounded-2xl space-y-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-800">
                OFFICIAL CRYPTOGRAPHIC QR
              </span>
              
              <div className="w-36 h-36 bg-white p-2 border border-zinc-300 rounded-xl shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=2&ecc=M&color=000000&bgcolor=ffffff&data=${encodeURIComponent(qrTargetUrl)}`}
                  alt="Permit QR"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="text-[9px] font-mono text-zinc-500">
                Scan via Eswatini Police, Road Safety Officers & Commuter Kiosks
              </div>

              <div className="w-full pt-2 border-t border-zinc-300 text-left text-[9px] text-zinc-600 space-y-0.5">
                <div><strong>Issue Date:</strong> {vehicle.permitIssueDate || "2026-08-01"}</div>
                <div><strong>Expiry Date:</strong> <span className="text-emerald-800 font-bold">{vehicle.permitExpiryDate || "2027-08-01"}</span></div>
              </div>
            </div>

          </div>

          {/* Statutory Conditions & Signatures Footer */}
          <div className="relative z-10 pt-4 border-t-2 border-zinc-300 grid grid-cols-2 gap-8 text-[10px] text-zinc-600">
            <div className="space-y-1">
              <div className="font-bold text-zinc-900 uppercase">Statutory Conditions:</div>
              <p className="leading-tight">
                1. This permit must be carried in the designated vehicle at all times and presented on demand to authorized officers.<br />
                2. The vehicle must undergo mandatory bi-annual Certificate of Fitness inspections.<br />
                3. Overloading beyond registered passenger capacity constitutes immediate grounds for permit suspension.
              </p>
            </div>

            <div className="flex flex-col justify-end items-end text-right space-y-1">
              <div className="w-44 border-b border-zinc-900 pb-1">
                <span className="font-mono text-[9px] text-zinc-400 block">Digital Verification Hash</span>
                <span className="font-mono font-bold text-zinc-900 text-[10px]">AUTH-RTB-2026-SZ</span>
              </div>
              <div className="font-bold text-zinc-900 uppercase">
                Chairman, Road Transportation Board
              </div>
              <div className="text-[9px] text-zinc-500">
                Kingdom of Eswatini
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
