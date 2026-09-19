/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QR token payload schema and encoding.
 *
 * A token is:
 *   v1.<base64url(payloadJSON)>.<base64url(hmac)>
 *
 * Where payloadJSON is the compact JSON of QrPayload below.
 * Where hmac is HMAC-SHA256(signingInput, secret) — see sign.ts.
 */

export const TOKEN_VERSION = "v1";

export interface QrPayload {
  /** Token type: 'vehicle' | 'operator' | 'marshal' (future) */
  t: "vehicle";
  /** Registration number, e.g. "HSD 101 BM" */
  r: string;
  /** VIC, e.g. "HBM-101" */
  v: string;
  /** Permit number, e.g. "G1090/2026" */
  p: string;
  /** Permit status at time of issue: 'Active' | 'Expired' | 'Suspended' */
  s: string;
  /** Permit expiry date, YYYY-MM-DD */
  e: string;
  /** Issued-at timestamp, Unix seconds */
  i: number;
}

// ---------------------------------------------------------------------------
// Base64URL encoding (no padding, safe for URLs and QR)
// ---------------------------------------------------------------------------

export function toBase64Url(input: string): string {
  // Encode as UTF-8 -> base64 -> base64url
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(input: string): string {
  // Restore padding
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// ---------------------------------------------------------------------------
// Payload validation
// ---------------------------------------------------------------------------

export function isQrPayload(x: unknown): x is QrPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    o.t === "vehicle" &&
    typeof o.r === "string" &&
    typeof o.v === "string" &&
    typeof o.p === "string" &&
    typeof o.s === "string" &&
    typeof o.e === "string" &&
    typeof o.i === "number"
  );
}
