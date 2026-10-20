/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Canonical public origin for links and QR codes.
 *
 * Order:
 *   1. NEXT_PUBLIC_APP_URL  (set this in Vercel to your real domain)
 *   2. https://VERCEL_URL   (automatic on Vercel deployments)
 *   3. window.location.origin (browser only)
 *   4. http://localhost:3000 (local dev only)
 */

export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

/**
 * Public cryptographic verify page for a signed QR token.
 * Token lives in the URL *hash* so ordinary access logs / analytics
 * do not record the full credential. The page reads location.hash and POSTs.
 * Query-string ?token= is still accepted for older printed codes.
 */
export function buildQrVerifyUrl(token: string): string {
  const base = getAppBaseUrl();
  return `${base}/verify#t=${encodeURIComponent(token)}`;
}
