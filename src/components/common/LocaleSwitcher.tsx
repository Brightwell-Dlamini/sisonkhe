/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useLocale } from "@/hooks/useLocale";
import type { Locale } from "@/lib/i18n/messages";

export default function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, labels, t, ready } = useLocale();

  if (!ready) return null;

  return (
    <label className={`inline-flex items-center gap-1.5 text-[10px] text-zinc-400 ${className}`}>
      <span className="sr-only sm:not-sr-only uppercase font-bold tracking-wide">
        {t("locale.switch")}
      </span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="bg-[#0F0F10] border border-white/[0.1] rounded-lg px-2 py-1 text-[11px] text-white font-semibold focus:outline-none focus:border-emerald-500/50"
        aria-label={t("locale.switch")}
      >
        {(Object.keys(labels) as Locale[]).map((code) => (
          <option key={code} value={code}>
            {labels[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
