/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client locale preference (en | ss). Stored in localStorage.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isLocale,
  t as translate,
  type Locale,
  type MessageKey,
  LOCALES,
  LOCALE_LABELS,
} from "@/lib/i18n/messages";

const STORAGE_KEY = "sisonkhe.locale";

function readStored(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(raw)) return raw;
  } catch {
    /* private mode */
  }
  return "en";
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocaleState(readStored());
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: MessageKey) => translate(locale, key),
    [locale]
  );

  return { locale, setLocale, t, ready, locales: LOCALES, labels: LOCALE_LABELS };
}
