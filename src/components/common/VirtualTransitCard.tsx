import React, { useState } from "react";
import { VehicleVirtualCard, Driver, Vehicle } from "../../types";
import QRCodeView from "./QRCodeView";
import { Copy, Check, Maximize2, ShieldCheck, Zap } from "lucide-react";

export interface VirtualTransitCardProps {
  card: VehicleVirtualCard;
  driver?: Driver;
  vehicle?: Vehicle;
  onPayRankFee?: () => void;
  onTopUp?: (amount: number) => void;
  onOpenDetails?: () => void;
  rankFee?: number;
  className?: string;
  showActions?: boolean;
}

/**
 * Clean high-security National Road Transport Council Commercial Virtual Pass
 * Exactly matching the design in the official specification image:
 * - Clean off-white background with subtle topographic wave contour lines
 * - "Sisonkhe In Transit" script branding with red/yellow/blue tri-color accent bar
 * - "COMMERCIAL PASS" heading with official circular NRTC emblem
 * - Embedded digital QR Code pass directly on the card face (replaces the bank chip)
 * - 16-digit card number in high-contrast bold mono spaced format
 * - Cardholder / Driver full name on bottom-left
 * - Current Balance with 'E' symbol on bottom-right
 */
export default function VirtualTransitCard({
  card,
  driver,
  vehicle,
  onPayRankFee,
  onTopUp,
  onOpenDetails,
  rankFee = 25,
  className = "",
  showActions = false
}: VirtualTransitCardProps) {
  const [copied, setCopied] = useState(false);
  const [isZoomedQR, setIsZoomedQR] = useState(false);

  const cardholderName = (driver?.fullName || card.cardholderName || "MELUSI SIMELANE").toUpperCase();
  const vehicleReg = vehicle?.registrationNumber || card.vehicleReg || "MSD 601 MZ";
  const vicNumber = vehicle?.fleetNumber || vehicle?.vic || card.vic || "MMZ-601";

  const handleCopyCard = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(card.cardNumber.replace(/\s+/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Official Transit QR Code payload
  const qrPayload = JSON.stringify({
    app: "Sisonkhe In transit",
    docType: "OFFICIAL_COMMERCIAL_TRANSIT_PASS",
    cardNumber: card.cardNumber,
    cardholder: cardholderName,
    vehicleReg: vehicleReg,
    vic: vicNumber,
    status: card.status,
    balanceSZL: card.balanceSZL,
    issuedBy: "National Road Transport Council (NRTC)",
    timestamp: new Date().toISOString()
  });

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* The Physical Card Container with ISO Aspect Ratio (~1.6:1) */}
      <div 
        id="sisonkhe-virtual-transit-card"
        className="relative w-full max-w-[560px] aspect-[1.6/1] bg-white rounded-2xl sm:rounded-3xl border border-zinc-300 dark:border-zinc-700 shadow-xl overflow-hidden select-none p-4 sm:p-6 flex flex-col justify-between"
        style={{
          boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 4px 12px -2px rgba(0, 0, 0, 0.05)"
        }}
      >
        {/* Topographic Wave Contour Lines Background - Exact match to image.png */}
        <div className="absolute inset-0 pointer-events-none opacity-85 overflow-hidden">
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 560 350"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            {/* Smooth undulating topographic wave contours */}
            <g stroke="#d5d9df" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
              {/* Outer wave 1 */}
              <path d="M-20,40 C60,40 100,15 170,15 C240,15 280,60 360,60 C440,60 480,20 580,20" />
              {/* Outer wave 2 */}
              <path d="M-20,70 C70,70 110,40 180,40 C250,40 290,90 370,90 C450,90 490,45 580,45" />
              {/* Mid contours around QR code area */}
              <path d="M-20,110 C80,110 130,85 190,85 C270,85 300,130 390,130 C460,130 510,75 580,75" />
              <path d="M-20,150 C90,150 140,120 210,120 C290,120 320,165 410,165 C480,165 520,110 580,110" />
              <path d="M-20,190 C100,190 150,155 230,155 C310,155 340,205 430,205 C500,205 530,145 580,145" />
              <path d="M-20,230 C110,230 160,195 250,195 C330,195 360,245 450,245 C520,245 540,180 580,180" />
              <path d="M-20,270 C120,270 170,235 270,235 C350,235 380,285 470,285 C540,285 550,215 580,215" />
              <path d="M-20,310 C130,310 180,275 290,275 C370,275 400,325 490,325 C550,325 560,250 580,250" />
              {/* Concentric oval contours on the right side */}
              <path d="M380,180 C440,130 520,130 560,190 C600,250 520,310 440,310 C360,310 320,230 380,180 Z" />
              <path d="M400,190 C450,150 500,150 540,200 C570,240 500,290 440,290 C380,290 350,230 400,190 Z" />
              <path d="M420,205 C460,170 490,170 520,210 C540,240 480,275 440,275 C400,275 380,230 420,205 Z" />
              {/* Concentric oval loops on the left / center */}
              <path d="M120,170 C160,130 220,130 250,170 C280,210 240,250 180,250 C120,250 80,210 120,170 Z" />
              <path d="M140,180 C170,150 200,150 230,180 C250,200 220,230 180,230 C140,230 110,200 140,180 Z" />
            </g>
          </svg>
        </div>

        {/* TOP ROW: Sisonkhe In Transit Brand (Left) & NRTC Commercial Pass Badge (Right) */}
        <div className="relative z-10 flex items-start justify-between">
          {/* Sisonkhe In Transit Branding */}
          <div className="flex flex-col">
            <h1 
              className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight leading-none"
              style={{
                fontFamily: "Georgia, Cambria, 'Times New Roman', serif",
                fontStyle: "italic",
                letterSpacing: "-0.02em"
              }}
            >
              Sisonkhe
            </h1>
            {/* Color Accent Bar & 'In Transit' text */}
            <div className="flex items-center gap-1.5 mt-1 sm:mt-1.5">
              <div className="flex h-2 sm:h-2.5 rounded-xs overflow-hidden shadow-2xs">
                <div className="w-4 sm:w-5 bg-[#e11d48]" />
                <div className="w-4 sm:w-5 bg-[#eab308]" />
                <div className="w-4 sm:w-5 bg-[#38bdf8]" />
              </div>
              <span 
                className="text-xs sm:text-sm font-bold text-black tracking-wide"
                style={{ fontStyle: "italic" }}
              >
                In Transit
              </span>
            </div>
          </div>

          {/* Right Header: COMMERCIAL PASS text + Official NRTC Round Seal */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-black font-sans italic pr-1">
              COMMERCIAL PASS
            </span>

            {/* Official NRTC Circular Seal */}
            <div className="mt-1 relative w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 drop-shadow-sm">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Outer Navy Ring */}
                <circle cx="50" cy="50" r="48" fill="#1e3a8a" stroke="#172554" strokeWidth="2" />
                
                {/* Inner White Ring separator */}
                <circle cx="50" cy="50" r="39" fill="none" stroke="#ffffff" strokeWidth="1" />

                {/* Curved Text in Blue Ring: NATIONAL ROAD TRANSPORT COUNCIL */}
                <path id="nrtc-upper-arc" d="M 17,50 A 33,33 0 0,1 83,50" fill="none" />
                <text fill="#ffffff" fontSize="6.5" fontWeight="900" letterSpacing="0.8">
                  <textPath href="#nrtc-upper-arc" startOffset="50%" textAnchor="middle">
                    NATIONAL ROAD
                  </textPath>
                </text>
                <path id="nrtc-lower-arc" d="M 83,52 A 33,33 0 0,1 17,52" fill="none" />
                <text fill="#ffffff" fontSize="6" fontWeight="900" letterSpacing="0.8">
                  <textPath href="#nrtc-lower-arc" startOffset="50%" textAnchor="middle">
                    TRANSPORT COUNCIL
                  </textPath>
                </text>

                {/* Inner Gold / Yellow Circle */}
                <circle cx="50" cy="50" r="29" fill="#facc15" stroke="#eab308" strokeWidth="1" />

                {/* Highway winding into the distance */}
                {/* Road surface */}
                <path 
                  d="M 38,68 C 42,55 45,46 48,36 L 52,36 C 55,46 58,55 62,68 Z" 
                  fill="#09090b" 
                />
                {/* Yellow dashed center line */}
                <path 
                  d="M 50,38 L 50,66" 
                  stroke="#facc15" 
                  strokeWidth="1.5" 
                  strokeDasharray="2.5, 2.5" 
                />

                {/* Red Banner across bottom of circle */}
                <path 
                  d="M 22,64 L 78,64 L 74,77 L 26,77 Z" 
                  fill="#dc2626" 
                  stroke="#991b1b" 
                  strokeWidth="0.8" 
                />
                {/* NRTC Text in Red Banner */}
                <text 
                  x="50" 
                  y="74" 
                  fill="#ffffff" 
                  fontSize="9.5" 
                  fontWeight="900" 
                  textAnchor="middle" 
                  fontFamily="system-ui, sans-serif"
                  letterSpacing="0.5"
                >
                  NRTC
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: Embedded QR Code Pass (where the bank chip used to be) */}
        <div className="relative z-10 flex items-center gap-4 my-auto">
          {/* Prominent White Rounded Square with Digital QR Code */}
          <div 
            onClick={() => setIsZoomedQR(true)}
            className="group relative bg-white p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-zinc-200/90 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center justify-center flex-shrink-0"
            title="Click to view full-screen digital pass"
          >
            <QRCodeView
              data={qrPayload}
              size={96}
              margin={1}
              fgColor="#000000"
              bgColor="#ffffff"
            />
            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-black/40 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 className="w-5 h-5 text-white drop-shadow" />
            </div>
          </div>

          {/* Quick info beside QR code */}
          <div className="hidden sm:flex flex-col text-left text-zinc-700">
            <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 font-sans">
              OFFICIAL VEHICLE PASS
            </span>
            <span className="text-xs font-black font-mono text-black">
              {vehicleReg}
            </span>
            <span className="text-[10px] font-bold text-zinc-600 font-mono">
              VIC: {vicNumber}
            </span>
            <div className="mt-1 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-semibold text-emerald-700">CONCESSION ACTIVE</span>
            </div>
          </div>
        </div>

        {/* CARD NUMBER ROW (Full width, bold, spaced digits as in user image) */}
        <div className="relative z-10 mt-auto pt-1 sm:pt-2">
          <div className="flex items-center justify-between">
            <div 
              className="text-lg sm:text-2xl font-mono tracking-[0.18em] sm:tracking-[0.24em] font-extrabold text-black select-text"
              style={{
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                fontWeight: 900
              }}
            >
              {card.cardNumber || "5342 4250 9425 3642"}
            </div>
            
            <button
              onClick={handleCopyCard}
              className="p-1 sm:p-1.5 rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors"
              title="Copy Card Number"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* BOTTOM ROW: Driver Full Name (Left) & Current Balance (Right) */}
        <div className="relative z-10 pt-2 sm:pt-3 border-t border-zinc-200/80 flex items-end justify-between">
          {/* Driver / Cardholder Full Name */}
          <div className="flex flex-col text-left">
            <span 
              className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black select-text"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 800
              }}
            >
              {cardholderName}
            </span>
          </div>

          {/* Current Balance Box */}
          <div className="flex flex-col items-end text-right">
            <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-zinc-600 font-sans">
              CURRENT BALANCE
            </span>
            <span 
              className="text-sm sm:text-lg font-bold font-mono text-black leading-tight select-text"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 800
              }}
            >
              E {card.balanceSZL.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Optional Card Action Controls (Payment & Top-Up) */}
      {showActions && (
        <div className="w-full max-w-[560px] mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {onPayRankFee && (
            <button
              onClick={onPayRankFee}
              className="py-2.5 px-3 bg-zinc-900 hover:bg-black text-amber-400 border border-amber-500/40 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Pay Rank Fee E{rankFee.toFixed(2)}</span>
            </button>
          )}

          {onTopUp && (
            <button
              onClick={() => onTopUp(100)}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <span>+ Quick Reload E100</span>
            </button>
          )}

          {onOpenDetails && (
            <button
              onClick={onOpenDetails}
              className="py-2.5 px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-zinc-500" />
              <span>Card Statement</span>
            </button>
          )}
        </div>
      )}

      {/* Zoomed QR Code Inspection Modal */}
      {isZoomedQR && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Commercial Transit Pass
              </span>
              <button
                onClick={() => setIsZoomedQR(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-inner flex flex-col items-center">
              <QRCodeView
                data={qrPayload}
                size={220}
                margin={2}
                fgColor="#000000"
                bgColor="#ffffff"
                showActions={true}
              />
            </div>

            <div className="text-left bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500">Cardholder:</span>
                <strong className="text-zinc-900 dark:text-white">{cardholderName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Vehicle Reg:</span>
                <strong className="text-zinc-900 dark:text-white">{vehicleReg}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Fleet VIC:</span>
                <strong className="text-amber-500">{vicNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Balance:</span>
                <strong className="text-emerald-500 font-bold">E {card.balanceSZL.toFixed(2)}</strong>
              </div>
            </div>

            <button
              onClick={() => setIsZoomedQR(false)}
              className="w-full py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
