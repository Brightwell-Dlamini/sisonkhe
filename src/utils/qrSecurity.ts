/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-safe QR URL helpers. Signing is server-only (/api/qr/issue).
 * Never emit plate-only /verify?plate= links — those cannot be verified.
 */

import { buildQrVerifyUrl, getAppBaseUrl } from "@/lib/appUrl";

/**
 * Build the public verify URL for an already-signed token.
 * Token must come from POST /api/qr/issue or a printed permit document.
 */
export function getVehicleQRUrl(token: string): string {
  if (!token || typeof token !== "string") {
    throw new Error("getVehicleQRUrl requires a signed QR token from /api/qr/issue");
  }
  const trimmed = token.trim();
  if (!trimmed.startsWith("v1.")) {
    throw new Error("Invalid QR token: expected v1.* signed payload");
  }
  return buildQrVerifyUrl(trimmed);
}

export { getAppBaseUrl, buildQrVerifyUrl };
