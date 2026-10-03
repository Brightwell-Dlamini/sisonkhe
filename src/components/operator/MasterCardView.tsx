"use client";

import { CreditCard, ShieldCheck, Snowflake } from "lucide-react";
import type { OperatorMasterCard } from "@/lib/operator/queries";

interface Props {
  card: OperatorMasterCard;
}

export default function MasterCardView({ card }: Props) {
  const formatted = card.cardNumber.replace(/(\d{4})(?=\d)/g, "$1 ");
  const isFrozen = card.status === "Frozen";

  return (
    <div
      className={`relative rounded-3xl overflow-hidden p-6 shadow-2xl max-w-md mx-auto transition-all ${
        isFrozen
          ? "bg-gradient-to-br from-slate-500 via-slate-600 to-slate-800 text-white opacity-90"
          : "bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 text-black"
      }`}
    >
      <div className="absolute inset-0 opacity-10">
        <svg viewBox="0 0 400 200" className="w-full h-full">
          <circle cx="350" cy="50" r="120" fill="currentColor" />
          <circle cx="350" cy="50" r="80" fill="currentColor" />
          <circle cx="60" cy="160" r="100" fill="currentColor" />
        </svg>
      </div>

      <div className="relative z-10 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpg"
                alt=""
                className="w-6 h-6 rounded-md object-cover ring-1 ring-white/30"
              />
              <div className="text-[10px] uppercase tracking-widest opacity-70 font-mono">
                Sisonkhe In Transit
              </div>
            </div>
            <div className="text-base font-black uppercase mt-0.5">
              {card.cardTier}
            </div>
          </div>
          {isFrozen ? (
            <Snowflake className="w-8 h-8 opacity-80" />
          ) : (
            <CreditCard className="w-8 h-8 opacity-80" />
          )}
        </div>

        <div className="pt-4">
          <div className="text-[10px] uppercase opacity-70 tracking-wider">
            Operator Master Card
          </div>
          <div className="text-2xl font-mono font-black tracking-wider">
            {formatted}
          </div>
        </div>

        <div className="flex items-end justify-between pt-4 border-t border-current/20">
          <div>
            <div className="text-[10px] uppercase opacity-70">Operator</div>
            <div className="text-sm font-bold uppercase">
              {card.operatorName}
            </div>
            <div className="text-[10px] font-mono opacity-70 mt-0.5">
              {card.companyName}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase opacity-70">Balance</div>
            <div className="text-2xl font-mono font-black">
              E {card.balanceSzl.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 text-[10px]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Exp: {card.expiryDate}
          </span>
          <span className="opacity-70">Status: {card.status}</span>
        </div>
      </div>
    </div>
  );
}
