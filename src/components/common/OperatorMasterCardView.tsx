/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { OperatorMasterCard, FleetOperator } from "../../types";
import QRCodeView from "./QRCodeView";
import { Copy, Check, Maximize2, ShieldCheck, ArrowUpRight, Send, Snowflake, Flame } from "lucide-react";

export interface OperatorMasterCardViewProps {
  card: OperatorMasterCard;
  operator: FleetOperator;
  onTopUp?: () => void;
  onSendMoney?: () => void;
  onToggleFreeze?: () => void;
  className?: string;
  showActions?: boolean;
}

/**
 * High-Security National Road Transport Council Enterprise Operator Master Pass
 * Features the signature Sisonkhe In Transit commercial pass layout tailored for fleet vehicle owners:
 * - Subtle topographic contour waves background
 * - Sisonkhe In Transit script logo & tri-color accent bar
 * - OPERATOR MASTER PASS badge + Official Circular NRTC Seal
 * - Embedded Enterprise QR Pass (scannable by bank agents & rank inspectors)
 * - 16-digit master card number in bold spaced monospace font
 * - Operator Name & Company
 * - Master Enterprise Balance in Emalangeni (SZL)
 */
export default function OperatorMasterCardView({
  card,
  operator,
  onTopUp,
  onSendMoney,
  onToggleFreeze,
  className = "",
  showActions = true
}: OperatorMasterCardViewProps) {
  const [copied, setCopied] = useState(false);
  const [isZoomedQR, setIsZoomedQR] = useState(false);

  const handleCopy = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(card.cardNumber.replace(/\s+/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFrozen = card.status === "Frozen";

  // Official Enterprise Master Pass QR payload
  const qrPayload = JSON.stringify({
    app: "Sisonkhe In transit",
    docType: "OFFICIAL_OPERATOR_MASTER_PASS",
    cardId: card.id,
    cardNumber: card.cardNumber,
    operatorId: operator.id,
    operatorName: operator.name,
    company: operator.companyName,
    taxNo: operator.taxNumber,
    association: operator.association,
    tier: card.cardTier,
    balanceSZL: card.balanceSZL,
    status: card.status,
    expiry: card.expiryDate,
    sig: "SZ-OP-" + Math.abs(card.cardNumber.split(" ").reduce((acc, part) => acc + Number(part || 0), 0)).toString(16)
  });

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* THE MASTER TRANSIT PASS */}
      <div 
        id="operator-master-pass-card"
        className={`relative w-full max-w-[560px] aspect-[1.6/1] rounded-2xl sm:rounded-3xl p-5 sm:p-7 overflow-hidden border shadow-lg transition-all select-none flex flex-col justify-between ${
          isFrozen 
            ? "bg-[#edf2f7] border-blue-300 opacity-90 grayscale-[30%]" 
            : "bg-[#f8f9fa] border-zinc-300 hover:shadow-xl"
        }`}
        style={{
          boxShadow: "0 10px 30px -8px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)"
        }}
      >
        {/* Subtle Topographic Wave Contours (Matching Official Specification) */}
        <div className="absolute inset-0 pointer-events-none opacity-45 overflow-hidden">
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 560 350"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <g stroke="#cbd5e1" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M-20,40 C60,40 100,15 170,15 C240,15 280,60 360,60 C440,60 480,20 580,20" />
              <path d="M-20,70 C70,70 110,40 180,40 C250,40 290,90 370,90 C450,90 490,45 580,45" />
              <path d="M-20,110 C80,110 130,85 190,85 C270,85 300,130 390,130 C460,130 510,75 580,75" />
              <path d="M-20,150 C90,150 140,120 210,120 C290,120 320,165 410,165 C480,165 520,110 580,110" />
              <path d="M-20,190 C100,190 150,155 230,155 C310,155 340,205 430,205 C500,205 530,145 580,145" />
              <path d="M-20,230 C110,230 160,195 250,195 C330,195 360,245 450,245 C520,245 540,180 580,180" />
              <path d="M-20,270 C120,270 170,235 270,235 C350,235 380,285 470,285 C540,285 550,215 580,215" />
              <path d="M-20,310 C130,310 180,275 290,275 C370,275 400,325 490,325 C550,325 560,250 580,250" />
              <path d="M380,180 C440,130 520,130 560,190 C600,250 520,310 440,310 C360,310 320,230 380,180 Z" />
              <path d="M400,190 C450,150 500,150 540,200 C570,240 500,290 440,290 C380,290 350,230 400,190 Z" />
              <path d="M120,170 C160,130 220,130 250,170 C280,210 240,250 180,250 C120,250 80,210 120,170 Z" />
            </g>
          </svg>
        </div>

        {/* TOP ROW: Sisonkhe In Transit Brand (Left) & NRTC Master Pass Badge (Right) */}
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
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
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500 text-black shadow-2xs">
                MASTER
              </span>
            </div>

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

          {/* Right Header: OPERATOR MASTER PASS text + Official NRTC Round Seal */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-black font-sans italic pr-1">
              OPERATOR MASTER PASS
            </span>

            {/* Official NRTC Circular Seal */}
            <div className="mt-1 relative w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 drop-shadow-sm">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="48" fill="#1e3a8a" stroke="#172554" strokeWidth="2" />
                <circle cx="50" cy="50" r="39" fill="none" stroke="#ffffff" strokeWidth="1" />
                <path id="nrtc-master-upper-arc" d="M 17,50 A 33,33 0 0,1 83,50" fill="none" />
                <text fill="#ffffff" fontSize="6.5" fontWeight="900" letterSpacing="0.8">
                  <textPath href="#nrtc-master-upper-arc" startOffset="50%" textAnchor="middle">
                    NATIONAL ROAD
                  </textPath>
                </text>
                <path id="nrtc-master-lower-arc" d="M 83,52 A 33,33 0 0,1 17,52" fill="none" />
                <text fill="#ffffff" fontSize="6" fontWeight="900" letterSpacing="0.8">
                  <textPath href="#nrtc-master-lower-arc" startOffset="50%" textAnchor="middle">
                    TRANSPORT COUNCIL
                  </textPath>
                </text>
                <circle cx="50" cy="50" r="29" fill="#facc15" stroke="#eab308" strokeWidth="1" />
                <path d="M 38,68 C 42,55 45,46 48,36 L 52,36 C 55,46 58,55 62,68 Z" fill="#09090b" />
                <path d="M 50,38 L 50,66" stroke="#facc15" strokeWidth="1.5" strokeDasharray="2.5, 2.5" />
                <path d="M 22,64 L 78,64 L 74,77 L 26,77 Z" fill="#dc2626" stroke="#991b1b" strokeWidth="0.8" />
                <text x="50" y="74" fill="#ffffff" fontSize="9.5" fontWeight="900" textAnchor="middle" fontFamily="system-ui, sans-serif" letterSpacing="0.5">
                  NRTC
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: Embedded Master QR Code Pass */}
        <div className="relative z-10 flex items-center gap-4 my-auto">
          <div 
            onClick={() => setIsZoomedQR(true)}
            className="group relative bg-white p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-zinc-300 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center justify-center flex-shrink-0"
            title="Click to view full-screen master QR pass"
          >
            <QRCodeView
              data={qrPayload}
              size={96}
              margin={1}
              fgColor="#000000"
              bgColor="#ffffff"
            />
            <div className="absolute inset-0 bg-black/40 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 className="w-5 h-5 text-white drop-shadow" />
            </div>
          </div>

          {/* Quick Enterprise details beside QR code */}
          <div className="hidden sm:flex flex-col text-left text-zinc-700">
            <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 font-sans">
              FLEET OPERATOR MASTER CARD
            </span>
            <span className="text-xs font-black font-mono text-black">
              {operator.companyName || "ENTERPRISE TRANSIT"}
            </span>
            <span className="text-[10px] font-bold text-zinc-600 font-mono">
              ASSOC: {operator.association}
            </span>
            <div className="mt-1 flex items-center gap-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${isFrozen ? "bg-blue-500" : "bg-emerald-500 animate-pulse"}`} />
              <span className={`text-[9px] font-bold uppercase ${isFrozen ? "text-blue-700" : "text-emerald-700"}`}>
                {isFrozen ? "CARD FROZEN" : "MASTER CONCESSION ACTIVE"}
              </span>
            </div>
          </div>
        </div>

        {/* CARD NUMBER ROW (Bold spaced monospace digits) */}
        <div className="relative z-10 mt-auto pt-1 sm:pt-2">
          <div className="flex items-center justify-between">
            <div 
              className="text-lg sm:text-2xl font-mono tracking-[0.18em] sm:tracking-[0.24em] font-extrabold text-black select-text"
              style={{
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                fontWeight: 900
              }}
            >
              {card.cardNumber || "5342 9901 4420 8812"}
            </div>
            
            <button
              onClick={handleCopy}
              className="p-1 sm:p-1.5 rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors"
              title="Copy Master Card Number"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* BOTTOM ROW: Operator Name (Left) & Master Balance (Right) */}
        <div className="relative z-10 pt-2 sm:pt-3 border-t border-zinc-200/80 flex items-end justify-between">
          <div className="flex flex-col text-left">
            <span 
              className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black select-text"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 800
              }}
            >
              {operator.name.toUpperCase()}
            </span>
            <span className="text-[9px] text-zinc-500 font-mono">
              EXP: {card.expiryDate} &bull; CVV: ***
            </span>
          </div>

          {/* Master Balance Box */}
          <div className="flex flex-col items-end text-right">
            <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-zinc-600 font-sans">
              MASTER BALANCE (SZL)
            </span>
            <span 
              className="text-sm sm:text-xl font-bold font-mono text-black leading-tight select-text"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 900
              }}
            >
              E {card.balanceSZL.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* MASTER ACTION BUTTONS BAR */}
      {showActions && (
        <div className="w-full max-w-[560px] mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {onSendMoney && (
            <button
              onClick={onSendMoney}
              disabled={isFrozen}
              className={`py-2.5 px-3 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                isFrozen 
                  ? "bg-zinc-200 text-zinc-400 cursor-not-allowed" 
                  : "bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-amber-500/20"
              }`}
            >
              <Send className="w-4 h-4 text-black" />
              <span>Send Money to Fleet</span>
            </button>
          )}

          {onTopUp && (
            <button
              onClick={onTopUp}
              className="py-2.5 px-3 bg-zinc-900 hover:bg-black text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs border border-zinc-700"
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              <span>Top Up Master Card</span>
            </button>
          )}

          {onToggleFreeze && (
            <button
              onClick={onToggleFreeze}
              className={`py-2.5 px-3 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                isFrozen
                  ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700"
              }`}
            >
              {isFrozen ? (
                <>
                  <Flame className="w-4 h-4 text-emerald-600" />
                  <span>Unfreeze Master</span>
                </>
              ) : (
                <>
                  <Snowflake className="w-4 h-4 text-blue-500" />
                  <span>Freeze Master</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* FULL-SCREEN ZOOM MODAL FOR MASTER QR CODE */}
      {isZoomedQR && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsZoomedQR(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  ENTERPRISE CLEARANCE PASS
                </span>
                <h3 className="font-extrabold text-zinc-900 text-base">
                  {operator.name}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                MASTER
              </span>
            </div>

            <div className="flex justify-center py-2">
              <QRCodeView
                data={qrPayload}
                size={220}
                margin={2}
                fgColor="#000000"
                bgColor="#ffffff"
              />
            </div>

            <div className="bg-zinc-50 p-3 rounded-xl text-xs font-mono text-zinc-700 text-left space-y-1">
              <div>Card: {card.cardNumber}</div>
              <div>Company: {operator.companyName}</div>
              <div>Association: {operator.association}</div>
              <div>Master Balance: E{card.balanceSZL.toFixed(2)}</div>
            </div>

            <button
              onClick={() => setIsZoomedQR(false)}
              className="w-full py-2.5 bg-zinc-900 text-white font-bold rounded-xl text-xs hover:bg-black transition-colors"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
