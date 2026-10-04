"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Megaphone,
  X,
  ExternalLink,
  Tag,
  Copy,
  Check,
} from "lucide-react";
import type { Advert } from "@/types";

interface Props {
  region: string;
}

const REFETCH_MS = 30000;
const ROTATE_MS = 8000;

export default function KioskAdvertBanner({ region }: Props) {
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchAdverts = async () => {
      try {
        const res = await fetch(
          `/api/public/adverts?region=${encodeURIComponent(region)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.adverts)) setAdverts(data.adverts);
      } catch {}
    };
    void fetchAdverts();
    const t = setInterval(fetchAdverts, REFETCH_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [region]);

  useEffect(() => {
    if (paused || dismissed || adverts.length <= 1) return;
    const t = setInterval(
      () => setIndex((i) => (i + 1) % adverts.length),
      ROTATE_MS
    );
    return () => clearInterval(t);
  }, [adverts.length, paused, dismissed]);

  const current = useMemo(() => {
    if (adverts.length === 0) return null;
    return adverts[index % adverts.length];
  }, [adverts, index]);

  if (dismissed || !current) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!current.promoCode) return;
    navigator.clipboard.writeText(current.promoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="fixed bottom-0 left-0 right-0 z-30"
    >
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
      <div className="bg-black/90 backdrop-blur-lg border-t border-amber-500/15">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-900 border border-white/[0.08] shrink-0">
              <img
                src={current.imageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/90 text-black font-mono text-[9px] font-black uppercase tracking-[0.12em]">
                  <Megaphone className="w-2.5 h-2.5" />
                  Sponsored
                </span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500 truncate">
                  {current.sponsorName}
                </span>
              </div>
              <div className="font-space text-sm font-semibold text-white truncate mt-0.5">
                {current.title}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {current.promoCode && (
              <button
                onClick={handleCopy}
                type="button"
                className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-zinc-300 font-mono text-[11px] font-bold cursor-pointer transition-colors"
              >
                <Tag className="w-3 h-3" />
                {current.promoCode}
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 opacity-50" />
                )}
              </button>
            )}

            {current.websiteUrl && (
              <a
                href={current.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-mono text-[11px] font-black uppercase tracking-wider transition-colors"
              >
                View
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Dismiss advert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
