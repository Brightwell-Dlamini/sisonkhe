/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lightweight UI strings for field roles (marshal / driver) and shared chrome.
 * English (en) + siSwati (ss). Expand keys as screens are localised.
 */

export type Locale = "en" | "ss";

export const LOCALES: Locale[] = ["en", "ss"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ss: "siSwati",
};

const en = {
  "offline.banner": "You are offline — changes will sync when connection returns",
  "offline.syncing": "Syncing pending changes…",
  "offline.synced": "All changes synced",
  "marshal.dispatch": "Dispatch",
  "marshal.load": "Load",
  "marshal.depart": "Depart",
  "marshal.delay": "Delay",
  "marshal.breakdown": "Breakdown",
  "marshal.reset": "Reset to waiting",
  "marshal.queue": "Queue",
  "marshal.no_vehicle": "No vehicle selected",
  "marshal.offline_queued": "Action saved offline — will send when online",
  "driver.my_vehicle": "My vehicle",
  "driver.roster": "My roster",
  "driver.virtual_card": "Virtual card",
  "driver.signal_sent": "Signal sent to marshal",
  "driver.offline": "Working offline",
  "common.refresh": "Refresh",
  "common.retry": "Retry",
  "common.loading": "Loading…",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "locale.switch": "Language",
} as const;

type MessageKey = keyof typeof en;

const ss: Record<MessageKey, string> = {
  "offline.banner": "Awukho ku-inthanethi — tinguquko titawuhambiswa uma kufika inthanethi",
  "offline.syncing": "Kuhambiswa tinguquko letisalile…",
  "offline.synced": "Tinguquko tonkhe tihambisiwe",
  "marshal.dispatch": "Kuthumela",
  "marshal.load": "Layisha",
  "marshal.depart": "Hamba",
  "marshal.delay": "Libambe",
  "marshal.breakdown": "Kuphukile",
  "marshal.reset": "Buyisela ekulindzeni",
  "marshal.queue": "Ulayini",
  "marshal.no_vehicle": "Akukhetswanga imoto",
  "marshal.offline_queued": "Kwentwe kungakafiki inthanethi — kutawuhanjiswa uma ifika",
  "driver.my_vehicle": "Imoto yami",
  "driver.roster": "Luhlelo lwami",
  "driver.virtual_card": "Ikhadi le-virtual",
  "driver.signal_sent": "Umlayezo uthunyelwe kumashali",
  "driver.offline": "Usebenta kungakafiki inthanethi",
  "common.refresh": "Vuselela",
  "common.retry": "Phindza",
  "common.loading": "Kulayishwa…",
  "common.save": "Gcina",
  "common.cancel": "Khansela",
  "locale.switch": "Lulwimi",
};

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  en: { ...en },
  ss,
};

export type { MessageKey };

export function t(locale: Locale, key: MessageKey): string {
  return catalogs[locale][key] ?? catalogs.en[key] ?? key;
}

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "ss";
}
