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
  "marshal.on_duty": "Marshal on duty",
  "marshal.dispatch": "Dispatch",
  "marshal.load": "Load",
  "marshal.depart": "Depart",
  "marshal.delay": "Delay",
  "marshal.breakdown": "Breakdown",
  "marshal.reset": "Reset to waiting",
  "marshal.cancel_load": "Cancel load",
  "marshal.full_cabin": "Full cabin",
  "marshal.queue": "Queue",
  "marshal.no_vehicle": "No vehicle selected",
  "marshal.no_driver": "No driver",
  "marshal.blocked": "Blocked",
  "marshal.lead": "Lead",
  "marshal.offline_queued": "Action saved offline — will send when online",
  "marshal.refresh": "Refresh",
  "marshal.settings": "Queue settings",
  "marshal.settings_saved": "Settings saved",
  "marshal.save_settings": "Save settings",
  "driver.cab": "Driver cab",
  "driver.my_vehicle": "My vehicle",
  "driver.roster": "My roster",
  "driver.virtual_card": "Virtual card",
  "driver.signal_sent": "Signal sent to marshal",
  "driver.offline": "Working offline",
  "driver.status_title": "Update cab status (notifies marshal)",
  "driver.status_waiting": "Waiting",
  "driver.status_loading": "Loading",
  "driver.status_full": "Full cabin",
  "driver.status_depart": "Departing",
  "driver.marshal_final": "The marshal has final approval on queue dispatch.",
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
  "marshal.on_duty": "Umashali usebenta",
  "marshal.dispatch": "Kuthumela",
  "marshal.load": "Layisha",
  "marshal.depart": "Hamba",
  "marshal.delay": "Libambe",
  "marshal.breakdown": "Kuphukile",
  "marshal.reset": "Buyisela ekulindzeni",
  "marshal.cancel_load": "Khansela kulayisha",
  "marshal.full_cabin": "Ikhhabhi ligcwele",
  "marshal.queue": "Ulayini",
  "marshal.no_vehicle": "Akukhetswanga imoto",
  "marshal.no_driver": "Akukho umshayeli",
  "marshal.blocked": "Kuvinjelwe",
  "marshal.lead": "Phambili",
  "marshal.offline_queued": "Kwentwe kungakafiki inthanethi — kutawuhanjiswa uma ifika",
  "marshal.refresh": "Vuselela",
  "marshal.settings": "Tinhlelo telayini",
  "marshal.settings_saved": "Tinhlelo tigciniwe",
  "marshal.save_settings": "Gcina tinhlelo",
  "driver.cab": "Ikhhabhi yemshayeli",
  "driver.my_vehicle": "Imoto yami",
  "driver.roster": "Luhlelo lwami",
  "driver.virtual_card": "Ikhadi le-virtual",
  "driver.signal_sent": "Umlayezo uthunyelwe kumashali",
  "driver.offline": "Usebenta kungakafiki inthanethi",
  "driver.status_title": "Buyekeza simo sekhhabhi (yazisa umashali)",
  "driver.status_waiting": "Kulindze",
  "driver.status_loading": "Kulayishwa",
  "driver.status_full": "Ikhhabhi ligcwele",
  "driver.status_depart": "Kuyahamba",
  "driver.marshal_final": "Umashali unemvume yekugcina ekuthumeleni.",
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
