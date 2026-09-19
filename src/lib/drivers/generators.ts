/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Generators for driver credentials and identifiers.
 */

import "server-only";

/**
 * Generate a username from a full name.
 * e.g. "Sibusiso Dlamini" -> "sibusiso.dlamini"
 * Handles collisions by appending a numeric suffix.
 */
export function generateUsername(fullName: string, taken: Set<string>): string {
  const base = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, ".")
    .slice(0, 28);

  if (!base) {
    const fallback = `driver.${Date.now().toString().slice(-6)}`;
    taken.add(fallback);
    return fallback;
  }

  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }

  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}${i}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }

  const fallback = `${base}.${Date.now().toString().slice(-4)}`;
  taken.add(fallback);
  return fallback;
}

/**
 * Generate a temp password a driver can read aloud or copy.
 * Format: 3 uppercase + 4 digits + 3 lowercase + 4 digits (14 chars).
 * Deliberately avoids ambiguous chars (0/O, 1/I/l).
 */
export function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const pick = (chars: string, n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${pick(upper, 3)}${pick(digits, 4)}${pick(lower, 3)}${pick(digits, 4)}`;
}

/**
 * Generate a driver id (sortable, offline-first friendly).
 */
export function generateDriverId(): string {
  return `driver-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
