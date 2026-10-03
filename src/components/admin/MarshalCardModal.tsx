"use client";

import { X, ShieldCheck, Phone, MapPin, Building2 } from "lucide-react";
import type { MarshalRow } from "@/lib/admin/marshals";

interface Props {
  marshal: MarshalRow;
  onClose: () => void;
}

export default function MarshalCardModal({ marshal, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-start justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white">
            Marshal Card
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.jpg" alt="" className="w-6 h-6 rounded-md object-cover ring-1 ring-white/30" />
                  <div className="text-[10px] uppercase tracking-widest opacity-70 font-mono">
                    Sisonkhe In Transit
                  </div>
                </div>
                <div className="text-base font-black uppercase mt-0.5">
                  Marshal Pass
                </div>
              </div>
              <ShieldCheck className="w-6 h-6 opacity-80" />
            </div>

            <div>
              <div className="text-[10px] uppercase opacity-70">Marshal</div>
              <div className="text-lg font-black">{marshal.fullName}</div>
              {marshal.badgeNumber && (
                <div className="text-xs font-mono opacity-80">
                  Badge: {marshal.badgeNumber}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20 text-xs">
              <div>
                <div className="text-[10px] uppercase opacity-70 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Region
                </div>
                <div className="font-bold">{marshal.region}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase opacity-70 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Terminal
                </div>
                <div className="font-bold truncate">{marshal.terminalName}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] uppercase opacity-70 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Contact
                </div>
                <div className="font-mono">{marshal.cellNo ?? marshal.phone ?? "\u2014"}</div>
              </div>
            </div>

            <div className="text-center text-[9px] font-mono opacity-60 pt-2 border-t border-white/20">
              ID: {marshal.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
