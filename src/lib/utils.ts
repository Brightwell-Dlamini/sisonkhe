/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared utility functions. Currently the classname merge helper.
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes intelligently:
 *   cn("px-2 py-1", condition && "px-4") → "py-1 px-4"
 *
 * Later classes win over earlier ones when they conflict, but only for
 * Tailwind utilities that map to the same CSS property.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a date for the kiosk display.
 */
export function formatKioskDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

/**
 * Format a time for the kiosk display (HH:MM).
 */
export function formatKioskTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
