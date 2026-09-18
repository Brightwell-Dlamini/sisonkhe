import React, { useState, useEffect, useMemo } from "react";
import { Advert, EswatiniRegion } from "../types";
import { INITIAL_ADVERTS } from "../utils/mockData";
import {
  Megaphone,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
  Phone,
  Globe,
  Sparkles,
  Radio,
  ChevronDown,
  ChevronUp,
  Tag,
  ShieldCheck,
  Layers
} from "lucide-react";

interface CommuterSponsoredBottomBannerProps {
  activeRegion?: EswatiniRegion;
}

export const CommuterSponsoredBottomBanner: React.FC<CommuterSponsoredBottomBannerProps> = ({
  activeRegion = EswatiniRegion.Hhohho
}) => {
  const [adverts, setAdverts] = useState<Advert[]>(() => {
    try {
      const stored = localStorage.getItem("kombiflow_adverts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_ADVERTS;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [selectedModalAd, setSelectedModalAd] = useState<Advert | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync adverts when localStorage updates
  const reloadAdverts = () => {
    try {
      const stored = localStorage.getItem("kombiflow_adverts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAdverts(parsed);
          return;
        }
      }
    } catch (e) {}
    setAdverts(INITIAL_ADVERTS);
  };

  useEffect(() => {
    reloadAdverts();
    const handleStorage = () => reloadAdverts();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("kombiflow_adverts_updated", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("kombiflow_adverts_updated", handleStorage);
    };
  }, []);

  // Filter active adverts for current region or nationwide
  const activeAdverts = useMemo(() => {
    return adverts.filter((ad) => {
      if (!ad.isActive) return false;
      if (!ad.targetRegions || ad.targetRegions.length === 0) return true;
      return (
        ad.targetRegions.includes("All") ||
        ad.targetRegions.includes(activeRegion) ||
        ad.targetRegions.includes(activeRegion.toLowerCase() as any)
      );
    });
  }, [adverts, activeRegion]);

  // Safe current advert
  const currentAd: Advert | undefined = useMemo(() => {
    if (activeAdverts.length === 0) return undefined;
    return activeAdverts[currentIndex % activeAdverts.length];
  }, [activeAdverts, currentIndex]);

  // Auto-advance timer (every 7.5 seconds when not paused and not dismissed)
  useEffect(() => {
    if (isPaused || isMinimized || isDismissed || activeAdverts.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeAdverts.length);
    }, 7500);
    return () => clearInterval(timer);
  }, [isPaused, isMinimized, isDismissed, activeAdverts.length]);

  // Copy promo code helper
  const handleCopyPromo = (code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % activeAdverts.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + activeAdverts.length) % activeAdverts.length);
  };

  if (activeAdverts.length === 0 || isDismissed) {
    return null;
  }

  // MINIMIZED FLOATING PILL STATE (Allows commuters to still see & expand anytime)
  if (isMinimized) {
    return (
      <div className="fixed bottom-3 right-4 z-40 animate-fade-in">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-zinc-950/95 dark:bg-black/95 text-white border-2 border-amber-500/60 shadow-2xl hover:border-amber-400 transition-all cursor-pointer group"
          title="Click to expand Commuter Sponsored Broadcast"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <Megaphone className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-black uppercase tracking-wider font-space text-amber-400">
            Sponsored Offer:
          </span>
          <span className="text-xs font-bold text-white max-w-[150px] truncate">
            {currentAd?.sponsorName || "Exclusive Offer"}
          </span>
          <ChevronUp className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white" />
        </button>
      </div>
    );
  }

  if (!currentAd) return null;

  return (
    <>
      {/* ============================================================ */}
      {/* PROMINENT BOTTOM WEBSITE BANNER                             */}
      {/* ============================================================ */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="fixed bottom-0 left-0 right-0 z-40 transition-all duration-300"
      >
        {/* Top Vibrant Glowing Amber Bar */}
        <div className="h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.8)]" />

        {/* Banner Surface */}
        <div className="bg-zinc-950/95 dark:bg-black/95 backdrop-blur-md border-t border-amber-500/30 text-white shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* LEFT: Live Badge, Sponsor Thumbnail & Title */}
            <div
              onClick={() => setSelectedModalAd(currentAd)}
              className="flex items-center gap-3 w-full md:w-auto cursor-pointer group flex-1 min-w-0"
            >
              {/* Thumbnail / Sponsor Logo */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-black shrink-0 border-2 border-amber-500/50 shadow-md">
                <img
                  src={currentAd.imageUrl}
                  alt={currentAd.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>

              {/* Text & Badges */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Glowing Live Badge */}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] sm:text-[10px] font-black uppercase tracking-wider font-space">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <Megaphone className="w-3 h-3" />
                    <span>COMMUTER SPONSORED BROADCAST</span>
                  </span>

                  {/* Sponsor Name */}
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider font-space">
                    • {currentAd.sponsorName}
                  </span>

                  {/* Targeted Corridor Tag */}
                  {currentAd.targetRegions && (
                    <span className="hidden lg:inline-flex items-center gap-1 text-[9px] font-mono text-zinc-400 uppercase bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                      <span>{currentAd.targetRegions.includes("All") ? "🇸🇿 All Ranks" : currentAd.targetRegions.join(", ")}</span>
                    </span>
                  )}
                </div>

                {/* Offer Title & Summary */}
                <h4 className="text-xs sm:text-sm font-black text-white uppercase font-space truncate group-hover:text-amber-300 transition-colors mt-0.5">
                  {currentAd.title}
                </h4>

                {/* Description snippet on larger screens */}
                {currentAd.description && (
                  <p className="text-[11px] text-zinc-400 line-clamp-1 hidden sm:block">
                    {currentAd.description}
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT: Promo Code Chip, Action Button & Carousel Controls */}
            <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-zinc-800">
              
              {/* Quick Promo Code Tag if available */}
              {currentAd.promoCode && (
                <button
                  onClick={(e) => handleCopyPromo(currentAd.promoCode!, e)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Click to copy promo voucher code"
                >
                  <Tag className="w-3 h-3 text-amber-400" />
                  <span>{currentAd.promoCode}</span>
                  {copiedCode ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-zinc-400" />
                  )}
                </button>
              )}

              {/* Prominent CTA Button */}
              <button
                onClick={() => setSelectedModalAd(currentAd)}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider font-space flex items-center gap-1.5 shadow-md hover:shadow-amber-500/20 transition-all cursor-pointer"
              >
                <span>View Offer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              {/* Carousel Controls (if >1 advert) */}
              {activeAdverts.length > 1 && (
                <div className="flex items-center gap-1 pl-1 border-l border-zinc-800">
                  <button
                    onClick={handlePrev}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Previous sponsored broadcast"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-[10px] font-mono text-zinc-400 px-1 select-none">
                    {(currentIndex % activeAdverts.length) + 1}/{activeAdverts.length}
                  </span>

                  <button
                    onClick={handleNext}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Next sponsored broadcast"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Minimize / Dismiss Controls */}
              <div className="flex items-center gap-1 pl-1 border-l border-zinc-800">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Minimize banner to bottom pill"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsDismissed(true)}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DETAILED SPONSORED BROADCAST MODAL                          */}
      {/* ============================================================ */}
      {selectedModalAd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-950 border-2 border-amber-500/40 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl relative text-white space-y-0">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500/20 via-zinc-900 to-zinc-950 p-5 border-b border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-amber-500 text-black rounded-2xl shadow-md">
                  <Megaphone className="w-5 h-5 font-bold" />
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest font-space block">
                    COMMUTER SPONSORED BROADCAST
                  </span>
                  <h3 className="text-base font-black text-white uppercase font-space tracking-tight">
                    {selectedModalAd.sponsorName}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedModalAd(null)}
                className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Creative Photo Banner */}
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black h-52">
                <img
                  src={selectedModalAd.imageUrl}
                  alt={selectedModalAd.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-500/40 text-[10px] font-bold text-amber-300 uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Verified Transit Partner</span>
                </div>
              </div>

              {/* Title & Category */}
              <div>
                {selectedModalAd.category && (
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block mb-1">
                    {selectedModalAd.category}
                  </span>
                )}
                <h2 className="text-lg font-black uppercase font-space text-white leading-snug">
                  {selectedModalAd.title}
                </h2>
              </div>

              {/* Detailed Description */}
              <p className="text-zinc-300 leading-relaxed text-sm">
                {selectedModalAd.description ||
                  "Special commuter offer brought to you by our certified public transport partners across the Kingdom of Eswatini."}
              </p>

              {/* Voucher / Promo Code Box */}
              {selectedModalAd.promoCode && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-amber-400">
                    <span>Commuter Promo Voucher</span>
                    <span>Exclusive In-Transit Code</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 bg-black/50 p-2.5 rounded-xl border border-amber-500/20">
                    <span className="font-mono text-base font-black text-white tracking-wider">
                      {selectedModalAd.promoCode}
                    </span>
                    <button
                      onClick={() => handleCopyPromo(selectedModalAd.promoCode!)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-black text-xs uppercase flex items-center gap-1.5 hover:bg-amber-400 cursor-pointer transition-colors"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-950" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Contact & External Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {selectedModalAd.contactPhone && (
                  <a
                    href={`tel:${selectedModalAd.contactPhone}`}
                    className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 flex items-center justify-between text-zinc-300 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase font-bold">Customer Hotline</span>
                        <span className="font-mono font-bold text-xs">{selectedModalAd.contactPhone}</span>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400">Call</span>
                  </a>
                )}

                {selectedModalAd.websiteUrl && (
                  <a
                    href={selectedModalAd.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 flex items-center justify-between text-zinc-300 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-400" />
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase font-bold">Official Website</span>
                        <span className="font-bold text-xs truncate max-w-[130px] block">{selectedModalAd.sponsorName}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-blue-400" />
                  </a>
                )}
              </div>

              {/* Trust Badge */}
              <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center gap-2.5 text-[11px] text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Official commuter broadcast verified under Eswatini Road Transport Authority regulations.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedModalAd(null)}
                className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default CommuterSponsoredBottomBanner;
