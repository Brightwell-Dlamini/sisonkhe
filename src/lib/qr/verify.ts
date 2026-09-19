/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QR verification — runs on the server.
 *
 * Verifies signature, decodes payload, then re-checks the live database
 * state. A valid signature does NOT mean the vehicle is currently legal —
 * the permit may have been suspended since the QR was issued.
 */

import "server-only";
import {
  TOKEN_VERSION,
  fromBase64Url,
  isQrPayload,
  type QrPayload,
} from "./payload";
import { createSupabaseAdminClient } from "../supabase/server";

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

async function getVerificationKey(): Promise<CryptoKey> {
  const secret = process.env.QR_HMAC_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("QR_HMAC_SECRET is missing or too short.");
  }

  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

async function hmacVerify(
  signingInput: string,
  signatureB64: string
): Promise<boolean> {
  try {
    const key = await getVerificationKey();

    // Restore padding
    let b64 = signatureB64.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";

    const binary = atob(b64);
    const signatureBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      signatureBytes[i] = binary.charCodeAt(i);
    }

    return await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      new TextEncoder().encode(signingInput)
    );
  } catch (err) {
    console.error("[qr/verify] hmacVerify error:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Verification result
// ---------------------------------------------------------------------------

export type VerifyFailureReason =
  | "MALFORMED"
  | "UNKNOWN_VERSION"
  | "BAD_SIGNATURE"
  | "INVALID_PAYLOAD"
  | "VEHICLE_NOT_FOUND"
  | "PERMIT_SUSPENDED"
  | "PERMIT_EXPIRED"
  | "QR_TOO_OLD";

export interface VerifySuccess {
  valid: true;
  payload: QrPayload;
  vehicleExists: boolean;
  permitStatus: string;
  permitExpiry: string | null;
  issuedAt: Date;
}

export interface VerifyFailure {
  valid: false;
  reason: VerifyFailureReason;
  message: string;
  payload?: QrPayload;
}

export type VerifyResult = VerifySuccess | VerifyFailure;

// Max token age: 5 years. Anything older is considered suspicious.
const MAX_AGE_SECONDS = 5 * 365 * 24 * 60 * 60;

// ---------------------------------------------------------------------------
// Main verify function
// ---------------------------------------------------------------------------

export async function verifyQrToken(token: string): Promise<VerifyResult> {
  // 1. Structural check
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "MALFORMED", message: "Empty or non-string token." };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return {
      valid: false,
      reason: "MALFORMED",
      message: "Token must have 3 parts separated by dots.",
    };
  }

  const [version, payloadB64, signatureB64] = parts;

  // 2. Version check
  if (version !== TOKEN_VERSION) {
    return {
      valid: false,
      reason: "UNKNOWN_VERSION",
      message: `Unknown token version: ${version}`,
    };
  }

  // 3. Signature verification
  const signingInput = `${version}.${payloadB64}`;
  const signatureOk = await hmacVerify(signingInput, signatureB64);
  if (!signatureOk) {
    return {
      valid: false,
      reason: "BAD_SIGNATURE",
      message: "Signature verification failed. Token may be forged or tampered with.",
    };
  }

  // 4. Payload decode
  let payload: QrPayload;
  try {
    const json = fromBase64Url(payloadB64);
    const parsed: unknown = JSON.parse(json);
    if (!isQrPayload(parsed)) {
      return {
        valid: false,
        reason: "INVALID_PAYLOAD",
        message: "Payload does not match expected schema.",
      };
    }
    payload = parsed;
  } catch {
    return {
      valid: false,
      reason: "INVALID_PAYLOAD",
      message: "Could not decode payload JSON.",
    };
  }

  // 5. Age check
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.i > nowSec + 300) {
    return {
      valid: false,
      reason: "QR_TOO_OLD",
      message: "Token issued in the future — clock skew or tampering.",
      payload,
    };
  }
  if (nowSec - payload.i > MAX_AGE_SECONDS) {
    return {
      valid: false,
      reason: "QR_TOO_OLD",
      message: "Token is older than the 5-year maximum.",
      payload,
    };
  }

  // 6. Live database check
  const admin = createSupabaseAdminClient();
  const { data: vehicle, error } = await admin
    .from("vehicles")
    .select("registration_number, vic, permit_number, permit_status, permit_expiry_date")
    .eq("registration_number", payload.r)
    .maybeSingle();

  if (error) {
    console.error("[qr/verify] vehicle lookup error:", error);
    return {
      valid: false,
      reason: "VEHICLE_NOT_FOUND",
      message: "Could not query the vehicle registry.",
      payload,
    };
  }

  if (!vehicle) {
    return {
      valid: false,
      reason: "VEHICLE_NOT_FOUND",
      message: `Vehicle ${payload.r} is not in the current registry.`,
      payload,
    };
  }

  const livePermitStatus = (vehicle.permit_status as string | null) ?? "Active";
  const livePermitExpiry =
    (vehicle.permit_expiry_date as string | null) ?? null;

  if (livePermitStatus === "Suspended") {
    return {
      valid: false,
      reason: "PERMIT_SUSPENDED",
      message: "Vehicle permit is currently suspended.",
      payload,
    };
  }

  if (livePermitExpiry) {
    const expiry = new Date(livePermitExpiry);
    if (expiry.getTime() < Date.now()) {
      return {
        valid: false,
        reason: "PERMIT_EXPIRED",
        message: `Vehicle permit expired on ${livePermitExpiry}.`,
        payload,
      };
    }
  }

  // 7. Success
  return {
    valid: true,
    payload,
    vehicleExists: true,
    permitStatus: livePermitStatus,
    permitExpiry: livePermitExpiry,
    issuedAt: new Date(payload.i * 1000),
  };
}
