/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { newDriverId } from "@/lib/domain/ids";

export function generateUsername(fullName: string, taken: Set<string>): string {
  const base = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, ".")
    .slice(0, 28);

  if (!base) {
    const fallback = `driver.${newDriverId().slice(-8)}`;
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

  const fallback = `${base}.${newDriverId().slice(-6)}`;
  taken.add(fallback);
  return fallback;
}

export function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const pick = (chars: string, n: number) =>
    Array.from({ length: n }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  return `${pick(upper, 3)}${pick(digits, 4)}${pick(lower, 3)}${pick(digits, 4)}`;
}

export function generateDriverId(): string {
  return newDriverId();
}
