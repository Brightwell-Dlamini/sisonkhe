/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Global identity normalization — one plate, one person, one search key.
 */

/** Eswatini-style plate: upper, collapse internal spaces to single space. */
export function normalizePlate(reg: string | null | undefined): string {
  return (reg ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

/** Compact form for fuzzy match (no spaces). */
export function plateKey(reg: string | null | undefined): string {
  return normalizePlate(reg).replace(/\s+/g, "");
}

export function platesEqual(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const ka = plateKey(a);
  const kb = plateKey(b);
  if (!ka || !kb) return false;
  return ka === kb;
}

/** National ID / staff number — trim, upper for alphanumeric IDs. */
export function normalizeNationalId(id: string | null | undefined): string {
  return (id ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizePhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("268") && digits.length >= 11) return `+${digits}`;
  if (digits.length === 8) return `+268${digits}`;
  if (digits.startsWith("0") && digits.length === 9) return `+268${digits.slice(1)}`;
  return (phone ?? "").trim();
}

export function normalizeVIC(vic: string | null | undefined): string {
  return (vic ?? "").trim().toUpperCase().replace(/\s+/g, "");
}
