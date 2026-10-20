/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QR signing — server-only.
 * Prefers Ed25519 (v2). Falls back to HMAC v1 only when Ed25519 keys are absent
 * so existing deployments keep working until keys are configured.
 */

import "server-only";
import { sign as nodeSign } from "node:crypto";
import {
  TOKEN_VERSION_V1,
  TOKEN_VERSION_V2,
  toBase64Url,
  buildPermitRevision,
  type QrPayload,
  type VehicleQrPayload,
  type OperatorQrPayload,
  type DriverQrPayload,
} from "./payload";
import { getEd25519PrivateKey, getQrKeyId, hasEd25519PrivateKey } from "./keys";

let cachedHmacKey: CryptoKey | null = null;

async function getHmacSigningKey(): Promise<CryptoKey> {
  if (cachedHmacKey) return cachedHmacKey;
  const secret = process.env.QR_HMAC_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "QR_HMAC_SECRET is missing or too short. Generate with: openssl rand -base64 48"
    );
  }
  cachedHmacKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  return cachedHmacKey;
}

async function hmacSign(input: string): Promise<string> {
  const key = await getHmacSigningKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(input)
  );
  return toBase64Url(new Uint8Array(signature));
}

function ed25519Sign(input: string): string {
  const key = getEd25519PrivateKey();
  const sig = nodeSign(null, Buffer.from(input, "utf8"), key);
  return toBase64Url(new Uint8Array(sig));
}

export async function signQrPayload(payload: QrPayload): Promise<string> {
  const payloadB64 = toBase64Url(JSON.stringify(payload));

  if (hasEd25519PrivateKey()) {
    const signingInput = `${TOKEN_VERSION_V2}.${payloadB64}`;
    const signatureB64 = ed25519Sign(signingInput);
    return `${signingInput}.${signatureB64}`;
  }

  // Legacy path — only when Ed25519 is not configured yet
  console.warn(
    "[qr/sign] QR_ED25519_PRIVATE_KEY missing; issuing HMAC v1 token. Configure Ed25519 for production."
  );
  const signingInput = `${TOKEN_VERSION_V1}.${payloadB64}`;
  const signatureB64 = await hmacSign(signingInput);
  return `${signingInput}.${signatureB64}`;
}

export interface VehicleQrInput {
  registrationNumber: string;
  vic: string | null;
  permitNumber: string | null;
  permitStatus: string | null;
  permitExpiryDate: string | null;
  /** Optional explicit registry revision; otherwise derived from permit+expiry. */
  permitRevision?: string | null;
}

export async function signVehicleQr(vehicle: VehicleQrInput): Promise<string> {
  const rev =
    (vehicle.permitRevision && vehicle.permitRevision.trim()) ||
    buildPermitRevision(vehicle.permitNumber, vehicle.permitExpiryDate);

  const payload: VehicleQrPayload = {
    t: "vehicle",
    r: vehicle.registrationNumber.toUpperCase(),
    v: vehicle.vic ?? "",
    p: vehicle.permitNumber ?? "",
    s: vehicle.permitStatus ?? "Active",
    e: vehicle.permitExpiryDate ?? "",
    i: Math.floor(Date.now() / 1000),
    rev,
    kid: hasEd25519PrivateKey() ? getQrKeyId() : undefined,
  };
  return signQrPayload(payload);
}

export interface OperatorQrInput {
  id: string;
  name: string;
  operatorLicenseNumber: string | null;
}

export async function signOperatorQr(op: OperatorQrInput): Promise<string> {
  const payload: OperatorQrPayload = {
    t: "operator",
    id: op.id,
    n: op.name,
    l: op.operatorLicenseNumber ?? "",
    i: Math.floor(Date.now() / 1000),
    kid: hasEd25519PrivateKey() ? getQrKeyId() : undefined,
  };
  return signQrPayload(payload);
}

export interface DriverQrInput {
  id: string;
  fullName: string;
  pdpStatus: string | null;
  pdpExpiryDate: string | null;
}

export async function signDriverQr(driver: DriverQrInput): Promise<string> {
  const payload: DriverQrPayload = {
    t: "driver",
    id: driver.id,
    n: driver.fullName,
    s: driver.pdpStatus ?? "Valid",
    e: driver.pdpExpiryDate ?? "",
    i: Math.floor(Date.now() / 1000),
    kid: hasEd25519PrivateKey() ? getQrKeyId() : undefined,
  };
  return signQrPayload(payload);
}
