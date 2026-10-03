/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared className helpers.
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
