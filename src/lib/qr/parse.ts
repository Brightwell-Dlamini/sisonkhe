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

const TOKEN_RE = /\bv[12]\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;

function extractTokenFromHash(hash: string): string | null {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!h) return null;
  // #t=v2.... or #v2....
  const params = new URLSearchParams(h.includes("=") ? h : `t=${h}`);
  const t = params.get("t")?.trim() || params.get("token")?.trim();
  if (t && TOKEN_RE.test(t)) return t.match(TOKEN_RE)![0];
  const m = h.match(TOKEN_RE);
  return m ? m[0] : null;
}

/**
 * Accepts:
 * - raw v1.… / v2.… token
 * - https://host/verify?token=v2.…
 * - https://host/verify#t=v2.…
 * - plate / VIC text
 */
export function parseQrScanInput(raw: string): ParsedQrScan {
  const input = String(raw ?? "").trim();
  if (!input) return { kind: "empty" };

  if (input.startsWith("v1.") || input.startsWith("v2.")) {
    return { kind: "token", token: input };
  }

  if (/^https?:\/\//i.test(input)) {
    try {
      const url = new URL(input);
      const fromQuery =
        url.searchParams.get("token")?.trim() ||
        url.searchParams.get("t")?.trim();
      if (fromQuery && (fromQuery.startsWith("v1.") || fromQuery.startsWith("v2."))) {
        return { kind: "token", token: fromQuery };
      }
      const fromHash = extractTokenFromHash(url.hash);
      if (fromHash) return { kind: "token", token: fromHash };

      const plate = url.searchParams.get("plate")?.trim();
      if (plate) return { kind: "lookup", query: plate };
    } catch {
      // fall through
    }
  }

  // Bare hash-style paste
  if (input.startsWith("#") || input.includes("t=")) {
    const fromHash = extractTokenFromHash(input.startsWith("#") ? input : `#${input}`);
    if (fromHash) return { kind: "token", token: fromHash };
  }

  const tokenMatch = input.match(TOKEN_RE);
  if (tokenMatch) {
    return { kind: "token", token: tokenMatch[0] };
  }

  return { kind: "lookup", query: input };
}

/** Read token from the current browser location (query or hash). */
export function tokenFromLocation(
  search: string,
  hash: string
): string | null {
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const q = params.get("token")?.trim() || params.get("t")?.trim();
    if (q && (q.startsWith("v1.") || q.startsWith("v2."))) return q;
  } catch {
    // ignore
  }
  return extractTokenFromHash(hash);
}
