/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bottom advert banner. Fetches adverts from /api/public/adverts for the
 * current region and rotates through them.
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { Megaphone, X, ExternalLink, Tag, Copy, Check } from "lucide-react";
import type { Advert } from "@/types";

interface Props {
  region: string;
}

const REFETCH_MS = 30000;
const ROTATE_MS = 7000;

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
        if (!cancelled && Array.isArray(data.adverts)) {
          setAdverts(data.adverts);
        }
      } catch {
        // silent
      }
    };

    void fetchAdverts();
    const timer = window.setInterval(fetchAdverts, REFETCH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [region]);

  // Auto-rotate
  useEffect(() => {
    if (paused || dismissed || adverts.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % adverts.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
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
      <div className="h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />
      <div className="bg-zinc-950/95 dark:bg-black/95 backdrop-blur-md border-t border-amber-500/30 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src={current.imageUrl}
              alt={current.title}
              className="w-11 h-11 rounded-xl object-cover border-2 border-amber-500/40 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-black uppercase tracking-wider">
                  <Megaphone className="w-3 h-3" />
                  SPONSORED
                </span>
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  {current.sponsorName}
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-black text-white uppercase font-space truncate mt-0.5">
                {current.title}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {current.promoCode && (
              <button
                onClick={handleCopy}
                className="hidden sm:flex px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold items-center gap-1.5 cursor-pointer"
              >
                <Tag className="w-3 h-3" />
                {current.promoCode}
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 opacity-60" />
                )}
              </button>
            )}

            {current.websiteUrl && (
              <a
                href={current.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md"
              >
                View
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
