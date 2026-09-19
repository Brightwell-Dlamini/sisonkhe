/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QR signing — server-only.
 *
 * Uses Web Crypto's HMAC-SHA256. The secret comes from the QR_HMAC_SECRET
 * environment variable and is NEVER sent to the client.
 */

import "server-only";
import {
  TOKEN_VERSION,
  toBase64Url,
  type QrPayload,
} from "./payload";

// ---------------------------------------------------------------------------
// Secret loading
// ---------------------------------------------------------------------------

let cachedKey: CryptoKey | null = null;

async function getSigningKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const secret = process.env.QR_HMAC_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "QR_HMAC_SECRET is missing or too short. Generate with: openssl rand -base64 48"
    );
  }

  const keyBytes = new TextEncoder().encode(secret);
  cachedKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  return cachedKey;
}

// ---------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------

async function hmacSign(input: string): Promise<string> {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(input)
  );

  // signature is ArrayBuffer -> base64url
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Sign a QR payload. Returns the full token string.
 *
 * Token format: v1.<base64url(payload)>.<base64url(hmac)>
 */
export async function signQrPayload(payload: QrPayload): Promise<string> {
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = toBase64Url(payloadJson);
  const signingInput = `${TOKEN_VERSION}.${payloadB64}`;
  const signatureB64 = await hmacSign(signingInput);
  return `${signingInput}.${signatureB64}`;
}

// ---------------------------------------------------------------------------
// Convenience: build a vehicle QR token from a vehicle row
// ---------------------------------------------------------------------------

export interface VehicleQrInput {
  registrationNumber: string;
  vic: string | null;
  permitNumber: string | null;
  permitStatus: string | null;
  permitExpiryDate: string | null;
}

export async function signVehicleQr(
  vehicle: VehicleQrInput
): Promise<string> {
  const payload: QrPayload = {
    t: "vehicle",
    r: vehicle.registrationNumber.toUpperCase(),
    v: vehicle.vic ?? "",
    p: vehicle.permitNumber ?? "",
    s: vehicle.permitStatus ?? "Active",
    e: vehicle.permitExpiryDate ?? "",
    i: Math.floor(Date.now() / 1000),
  };
  return signQrPayload(payload);
}
