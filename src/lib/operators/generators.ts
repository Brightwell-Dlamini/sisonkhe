/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";

/**
 * Deterministic 16-digit card number for an operator master card.
 * Same algorithm used in operatorCards.ts (client-side) so the numbers
 * stay consistent whether generated client or server.
 */
export function generateMasterCardNumber(operatorId: string): string {
  const clean = operatorId.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  let hash = 9182;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const pos = Math.abs(hash);
  const part2 = String(1000 + (pos % 9000));
  const part3 = String(1000 + (Math.floor(pos / 10) % 9000));
  const part4 = String(1000 + (Math.floor(pos / 100) % 9000));
  return `5342 99${part2.substring(2)} ${part3} ${part4}`;
}

/**
 * Deterministic 3-digit CVV hash placeholder.
 * NOTE: Phase 5 will replace this with bcrypt/PBKDF2 hashing.
 */
export function generateCvvHash(operatorId: string): string {
  const clean = operatorId.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  let hash = 5381;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) + hash) + clean.charCodeAt(i);
  }
  return `h-${Math.abs(hash % 1000000).toString(16)}`;
}

export function generateOperatorId(): string {
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const pick = (chars: string, n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${pick(upper, 3)}${pick(digits, 4)}${pick(lower, 3)}${pick(digits, 4)}`;
}

/**
 * Generate a username for an operator. Uses the operator name if no email
 * local part is available (e.g. "cyril.kunene").
 */
export function generateUsername(operatorName: string, taken: Set<string>): string {
  const base = operatorName
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, ".")
    .slice(0, 28);

  if (!base) {
    const fallback = `operator.${Date.now().toString().slice(-6)}`;
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
