/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Normalize anything a camera or paste field might produce into a token
 * or a plain plate/VIC string for lookup.
 */

export type ParsedQrScan =
  | { kind: "token"; token: string }
  | { kind: "lookup"; query: string }
  | { kind: "empty" };

/**
 * Accepts:
 * - raw v1.… token
 * - https://host/verify?token=v1.…
 * - plate / VIC text
 */
export function parseQrScanInput(raw: string): ParsedQrScan {
  const input = String(raw ?? "").trim();
  if (!input) return { kind: "empty" };

  if (input.startsWith("v1.")) {
    return { kind: "token", token: input };
  }

  if (/^https?:\/\//i.test(input)) {
    try {
      const url = new URL(input);
      const token = url.searchParams.get("token")?.trim();
      if (token?.startsWith("v1.")) {
        return { kind: "token", token };
      }
      const plate = url.searchParams.get("plate")?.trim();
      if (plate) return { kind: "lookup", query: plate };
    } catch {
      // fall through
    }
  }

  // Token may appear embedded without scheme
  const tokenMatch = input.match(/v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  if (tokenMatch) {
    return { kind: "token", token: tokenMatch[0] };
  }

  return { kind: "lookup", query: input };
}
