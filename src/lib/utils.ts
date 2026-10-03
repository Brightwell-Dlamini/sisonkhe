/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared utility functions.
 */

type ClassValue = string | number | boolean | null | undefined | ClassValue[];

/**
 * Minimal className merger (no clsx / tailwind-merge dependency).
 * Falsy values are skipped; arrays are flattened.
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  const push = (v: ClassValue) => {
    if (!v && v !== 0) return;
    if (typeof v === "string" || typeof v === "number") {
      const s = String(v).trim();
      if (s) out.push(s);
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) push(item);
    }
  };

  for (const input of inputs) push(input);
  return out.join(" ");
}

/** Format a date for the kiosk display. */
export function formatKioskDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

/** Format a time for the kiosk display (HH:MM). */
export function formatKioskTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
