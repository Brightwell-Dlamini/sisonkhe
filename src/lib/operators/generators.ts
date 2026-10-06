/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { randomBytes } from "crypto";
import { newOperatorId } from "@/lib/domain/ids";

export function generateMasterCardNumber(operatorId: string): string {
  // Sequence-like from crypto, not reversible from operator id alone
  const buf = randomBytes(6);
  const n = buf.readUIntBE(0, 6);
  const p2 = String(1000 + (n % 9000));
  const p3 = String(1000 + (Math.floor(n / 9000) % 9000));
  const p4 = String(1000 + (Math.floor(n / 81_000_000) % 9000));
  return `5342 ${p2} ${p3} ${p4}`;
}

/** Opaque marker only — not a real CVV. Real cards use HSM later. */
export function generateCvvHash(_operatorId: string): string {
  return `cvv_${randomBytes(12).toString("hex")}`;
}

export function generateOperatorId(): string {
  return newOperatorId();
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

export function generateUsername(
  operatorName: string,
  taken: Set<string>
): string {
  const base = operatorName
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, ".")
    .slice(0, 28);

  if (!base) {
    const fallback = `operator.${newOperatorId().slice(-8)}`;
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

  const fallback = `${base}.${newOperatorId().slice(-6)}`;
  taken.add(fallback);
  return fallback;
}
