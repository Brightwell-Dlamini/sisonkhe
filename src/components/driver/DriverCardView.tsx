"use client";

import { useState } from "react";
import {
  CreditCard,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { useDriverCard } from "@/hooks/useDriverCard";
import CardTopUpModal from "./CardTopUpModal";

export default function DriverCardView() {
  const { card, loading, error, refresh } = useDriverCard();
  const [showTopUp, setShowTopUp] = useState(false);

  if (loading && !card) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center">
        <CreditCard className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
        <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
          No virtual card issued
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          A card is auto-issued when your vehicle is registered.
        </div>
      </div>
    );
  }

  const formatted = card.cardNumber.replace(/(\d{4})(?=\d)/g, "$1 ");

  return (
    <div className="space-y-4">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white p-6 shadow-2xl max-w-md mx-auto">
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 400 200" className="w-full h-full">
            <circle cx="350" cy="50" r="120" fill="white" />
            <circle cx="350" cy="50" r="80" fill="white" />
            <circle cx="60" cy="160" r="100" fill="white" />
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
            <CreditCard className="w-8 h-8 opacity-80" />
          </div>

          <div className="pt-4">
            <div className="text-[10px] uppercase opacity-70 tracking-wider">
              Vehicle Card
            </div>
            <div className="text-2xl font-mono font-black tracking-wider">
              {formatted}
            </div>
          </div>

          <div className="flex items-end justify-between pt-4 border-t border-white/20">
            <div>
              <div className="text-[10px] uppercase opacity-70">Cardholder</div>
              <div className="text-sm font-bold uppercase">
                {card.cardholderName}
              </div>
              <div className="text-[10px] font-mono opacity-70 mt-0.5">
                {card.vehicleReg} \u2022 {card.vic}
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

      <div className="flex justify-center">
        <button
          onClick={() => setShowTopUp(true)}
          disabled={card.status !== "Active"}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md"
        >
          <Plus className="w-4 h-4" />
          Top Up Balance
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <div className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-2">
          Concession Registration
        </div>
        <div className="space-y-1.5 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-zinc-500">Fee Amount:</span>
            <span className="text-zinc-900 dark:text-white font-bold">
              E {card.registrationFeeAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Status:</span>
            <span
              className={
                card.registrationFeePaid
                  ? "text-emerald-600 font-bold"
                  : "text-amber-600 font-bold"
              }
            >
              {card.registrationFeePaid ? "PAID" : "PENDING"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Receipt:</span>
            <span className="text-zinc-700 dark:text-zinc-300 truncate ml-2">
              {card.registrationReceiptRef}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
            Statement
          </h3>
          <span className="text-[10px] text-zinc-400 font-mono">
            {card.transactions.length} records
          </span>
        </div>

        {card.transactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            No transactions yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-96 overflow-y-auto">
            {card.transactions.map((tx) => {
              const isCredit = tx.direction === "CREDIT";
              return (
                <div
                  key={tx.id}
                  className="px-5 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isCredit
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600"
                          : "bg-blue-100 dark:bg-blue-950/60 text-blue-600"
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {tx.description}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {new Date(tx.timestamp).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`font-mono font-bold text-sm shrink-0 ${
                      isCredit
                        ? "text-emerald-600"
                        : "text-zinc-900 dark:text-white"
                    }`}
                  >
                    {isCredit ? "+" : "\u2212"}E{tx.amountSzl.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showTopUp && (
        <CardTopUpModal
          vehicleReg={card.vehicleReg}
          onClose={() => setShowTopUp(false)}
          onSuccess={() => {
            refresh();
            setShowTopUp(false);
          }}
        />
      )}
    </div>
  );
}
