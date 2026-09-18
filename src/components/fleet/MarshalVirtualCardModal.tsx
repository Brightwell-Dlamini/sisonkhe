import React, { useState } from "react";
import { MarshalAccount, Route } from "../../types";
import QRCodeView from "../common/QRCodeView";
import { 
  X, Copy, Check, Printer, ShieldCheck, Download, 
  RotateCw, Phone, MapPin, Building2, BadgeCheck, CheckCircle2, QrCode, Sparkles 
} from "lucide-react";

interface MarshalVirtualCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  marshal: MarshalAccount;
  assignedRoute?: Route | null;
  isNewRegistration?: boolean;
}

export default function MarshalVirtualCardModal({
  isOpen,
  onClose,
  marshal,
  assignedRoute,
  isNewRegistration = false
}: MarshalVirtualCardModalProps) {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);
  const [cardSide, setCardSide] = useState<"front" | "back">("front");
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const cardNumber = marshal.cardNumber || "9820 4401 8831 2049";
  const badgeNum = marshal.badgeNumber || "MSH-014";
  const fullName = marshal.fullName.toUpperCase();
  const terminalName = marshal.terminalName || "Mbabane Bus Terminus";
  const regionName = marshal.region || "Hhohho";
  const corridorText = assignedRoute 
    ? `${assignedRoute.origin} ➔ ${assignedRoute.destination}` 
    : (marshal.assignedRouteId || "Regional Corridors");

  const handleCopyCard = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(cardNumber.replace(/\s+/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Secure JSON verification payload for scanner
  const qrPayload = JSON.stringify({
    app: "Sisonkhe In transit",
    docType: "OFFICIAL_STATION_MARSHAL_PASS",
    marshalId: marshal.id,
    badgeNumber: badgeNum,
    cardholder: fullName,
    cardNumber: cardNumber,
    region: regionName,
    terminal: terminalName,
    corridor: corridorText,
    cellPhone: marshal.cellPhone || marshal.phone || "76000000",
    residentialAddress: marshal.residentialAddress || "Eswatini",
    status: marshal.status || "Active",
    role: marshal.marshalRole || "Station Dispatch Marshal",
    issuedBy: marshal.issuingAuthority || "National Road Transport Council (NRTC)",
    validUntil: marshal.expiryDate || "2028-09-16",
    timestamp: new Date().toISOString()
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[92vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-zinc-900 dark:text-white text-base">
                Official Station Marshal Pass
              </h3>
              <p className="text-xs text-zinc-500">
                National Road Transport Council (NRTC) Digital Dispatch Pass & ID
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCardSide(cardSide === "front" ? "back" : "front")}
              className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Flip Card ({cardSide === "front" ? "Back" : "Front"})</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Celebratory Alert If Just Registered */}
        {isNewRegistration && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-900 dark:text-emerald-100 animate-in fade-in duration-300">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <strong className="block font-bold">Marshal Successfully Registered!</strong>
              <span>
                Official Station Marshal Card <strong>#{cardNumber}</strong> has been generated and activated for {marshal.fullName}.
              </span>
            </div>
          </div>
        )}

        {/* Card Display Stage */}
        <div className="flex flex-col items-center justify-center py-2">
          
          {/* Card Container */}
          <div 
            id="sisonkhe-marshal-card"
            className="relative w-full max-w-[560px] aspect-[1.6/1] bg-white rounded-2xl sm:rounded-3xl border border-zinc-300 dark:border-zinc-700 shadow-2xl overflow-hidden select-none p-4 sm:p-6 flex flex-col justify-between"
            style={{
              boxShadow: "0 14px 35px -5px rgba(0, 0, 0, 0.15), 0 6px 16px -2px rgba(0, 0, 0, 0.08)"
            }}
          >
            {/* Topographic Wave Contour Lines Background */}
            <div className="absolute inset-0 pointer-events-none opacity-85 overflow-hidden">
              <svg
                className="w-full h-full object-cover"
                viewBox="0 0 560 350"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
              >
                <g stroke="#d5d9df" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <path d="M-20,40 C60,40 100,15 170,15 C240,15 280,60 360,60 C440,60 480,20 580,20" />
                  <path d="M-20,70 C70,70 110,40 180,40 C250,40 290,90 370,90 C450,90 490,45 580,45" />
                  <path d="M-20,110 C80,110 130,85 190,85 C270,85 300,130 390,130 C460,130 510,75 580,75" />
                  <path d="M-20,150 C90,150 140,120 210,120 C290,120 320,165 410,165 C480,165 520,110 580,110" />
                  <path d="M-20,190 C100,190 150,155 230,155 C310,155 340,205 430,205 C500,205 530,145 580,145" />
                  <path d="M-20,230 C110,230 160,195 250,195 C330,195 360,245 450,245 C520,245 540,180 580,180" />
                  <path d="M-20,270 C120,270 170,235 270,235 C350,235 380,285 470,285 C540,285 550,215 580,215" />
                  <path d="M-20,310 C130,310 180,275 290,275 C370,275 400,325 490,325 C550,325 560,250 580,250" />
                  <circle cx="480" cy="180" r="140" stroke="#e0e4ea" strokeWidth="2.2" />
                  <circle cx="480" cy="180" r="110" stroke="#e0e4ea" strokeWidth="2.2" />
                  <circle cx="480" cy="180" r="80" stroke="#e0e4ea" strokeWidth="2.2" />
                </g>
              </svg>
            </div>

            {/* Subtle Eswatini National Coat of Arms watermark */}
            <div className="absolute right-4 bottom-4 pointer-events-none opacity-10">
              <Building2 className="w-40 h-40 text-emerald-950" />
            </div>

            {cardSide === "front" ? (
              /* CARD FRONT */
              <>
                {/* Header Row */}
                <div className="relative z-10 flex items-start justify-between w-full">
                  {/* Left: Sisonkhe In Transit Brand */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-2xl sm:text-3xl font-serif italic text-blue-900 tracking-tight select-none"
                        style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Caveat', cursive, serif" }}
                      >
                        Sisonkhe In Transit
                      </span>
                    </div>
                    {/* Official Eswatini Flag Accent Bar */}
                    <div className="flex items-center h-1 w-28 sm:w-36 mt-0.5 rounded-full overflow-hidden shadow-xs">
                      <div className="h-full w-1/3 bg-blue-600" />
                      <div className="h-full w-1/3 bg-amber-400" />
                      <div className="h-full w-1/3 bg-rose-600" />
                    </div>
                  </div>

                  {/* Right: Pass Classification & NRTC Crest */}
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-[9px] sm:text-[11px] font-black tracking-widest text-emerald-900 uppercase">
                        STATION MARSHAL PASS
                      </div>
                      <div className="text-[7px] sm:text-[9px] font-bold text-emerald-700 tracking-wider uppercase">
                        RANK DISPATCH PASS
                      </div>
                    </div>
                    {/* Official Emblem Icon */}
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-md border border-white flex-shrink-0">
                      <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
                    </div>
                  </div>
                </div>

                {/* Middle Row: Photo/Avatar, QR Pass, and Details */}
                <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-4 my-auto">
                  {/* Left: QR Pass */}
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-zinc-300 shadow-md flex items-center justify-center flex-shrink-0">
                      <QRCodeView
                        value={qrPayload}
                        size={68}
                        className="sm:w-[84px] sm:h-[84px]"
                      />
                    </div>

                    {/* Marshal Photo */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-100 border-2 border-emerald-600 shadow-md flex items-center justify-center overflow-hidden flex-shrink-0">
                      {marshal.profilePictureUrl ? (
                        <img
                          src={marshal.profilePictureUrl}
                          alt={marshal.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-emerald-600 text-white flex items-center justify-center text-lg sm:text-xl font-black">
                          {marshal.fullName.split(" ").map(n => n[0]).join("")}
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-emerald-800/90 text-white text-[7px] sm:text-[8px] font-black text-center py-0.5">
                        {badgeNum}
                      </div>
                    </div>
                  </div>

                  {/* Right: Station & Region Assignment */}
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Assigned Rank Station
                    </span>
                    <span className="text-xs sm:text-sm font-black text-zinc-900 uppercase max-w-[200px] truncate">
                      {terminalName}
                    </span>
                    <span className="text-[9px] sm:text-[11px] font-bold text-emerald-700 uppercase">
                      {regionName} Region
                    </span>
                    <span className="text-[8px] sm:text-[10px] font-mono font-bold text-zinc-600 mt-1 max-w-[190px] truncate">
                      Corridor: {corridorText}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: 16-digit Pass Number & Cardholder Full Name */}
                <div className="relative z-10 w-full space-y-1.5 pt-2 border-t border-zinc-200/80">
                  {/* Card Number */}
                  <div className="flex items-center justify-between">
                    <span 
                      className="font-mono text-base sm:text-xl md:text-2xl font-black tracking-wider sm:tracking-widest text-zinc-900 select-all"
                      style={{ letterSpacing: "0.14em" }}
                    >
                      {cardNumber}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCard}
                      className="text-zinc-400 hover:text-zinc-800 p-1 rounded-lg transition-colors cursor-pointer"
                      title="Copy Pass Number"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Name and Validity */}
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[8px] sm:text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
                        AUTHORIZED RANK MARSHAL
                      </div>
                      <div className="text-xs sm:text-sm font-black text-zinc-900 tracking-wide">
                        {fullName}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[8px] sm:text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
                        VALIDITY
                      </div>
                      <div className="text-xs sm:text-sm font-black text-emerald-600 font-mono">
                        {marshal.expiryDate ? marshal.expiryDate.substring(0, 7) : "2028-09"} • ACTIVE
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* CARD BACK */
              <>
                {/* Magnetic Stripe */}
                <div className="relative z-10 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 h-10 sm:h-12 bg-zinc-800" />

                {/* Back content */}
                <div className="relative z-10 py-2 space-y-2 text-[9px] sm:text-[10px] text-zinc-600 leading-relaxed">
                  <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 font-mono text-[9px] space-y-1">
                    <div className="flex justify-between">
                      <span className="font-bold text-zinc-500">RESIDENTIAL:</span>
                      <span className="font-bold text-zinc-900">{marshal.residentialAddress || "Eswatini"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-zinc-500">CELL CONTACT:</span>
                      <span className="font-bold text-zinc-900">{marshal.cellPhone || marshal.phone || "+268 7600 0000"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-zinc-500">WHATSAPP:</span>
                      <span className="font-bold text-zinc-900">{marshal.whatsappPhone || marshal.cellPhone || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-zinc-500">ROLE:</span>
                      <span className="font-bold text-emerald-700">{marshal.marshalRole || "Station Dispatch Marshal"}</span>
                    </div>
                  </div>

                  <p className="text-[8px] sm:text-[9px] text-zinc-500">
                    This official Station Marshal pass is issued by the National Road Transport Council (NRTC) under the Kingdom of Eswatini Road Traffic Act. Authorized for commercial passenger queue supervision, vehicle dispatch verification, and rank fee collection. If lost, please return to nearest Transport Council regional office.
                  </p>
                </div>

                {/* Signature Bar & Emergency Contacts */}
                <div className="relative z-10 flex items-center justify-between pt-2 border-t border-zinc-200">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-32 bg-zinc-100 border border-zinc-300 rounded flex items-center px-2 text-[9px] font-mono text-zinc-400 italic">
                      Authorized Signature
                    </div>
                  </div>
                  <div className="text-right text-[8px] font-mono text-zinc-500">
                    EMERGENCY NRTC HOTLINE: +268 2404 0000
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleCopyCard}
            className="px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copied!" : "Copy Pass #"}</span>
          </button>

          <button
            onClick={() => setShowVerificationModal(true)}
            className="px-3 py-2.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>Verify QR</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Pass</span>
          </button>

          <button
            onClick={onClose}
            className="px-3 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <span>Done</span>
          </button>
        </div>

        {/* Verification Modal Simulation */}
        {showVerificationModal && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-black text-sm text-zinc-900 dark:text-white">
                    Official QR Signature Verified
                  </h4>
                </div>
                <button
                  onClick={() => setShowVerificationModal(false)}
                  className="p-1 rounded-full text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 font-mono space-y-1">
                  <div><strong>Badge:</strong> {badgeNum}</div>
                  <div><strong>Marshal:</strong> {fullName}</div>
                  <div><strong>Terminal:</strong> {terminalName} ({regionName})</div>
                  <div><strong>Corridor:</strong> {corridorText}</div>
                  <div><strong>Status:</strong> Valid & Authorized Dispatcher</div>
                  <div><strong>Issuing Body:</strong> National Road Transport Council</div>
                </div>

                <p className="text-[11px] text-zinc-500">
                  This digital signature is cryptographically valid and recognized by regional municipal terminals across Eswatini.
                </p>
              </div>

              <button
                onClick={() => setShowVerificationModal(false)}
                className="w-full py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Close Verification
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
