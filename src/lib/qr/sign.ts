/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QR signing — server-only (HMAC-SHA256 via Web Crypto).
 */

import "server-only";
import {
  TOKEN_VERSION,
  toBase64Url,
  type QrPayload,
  type VehicleQrPayload,
  type OperatorQrPayload,
  type DriverQrPayload,
} from "./payload";

let cachedKey: CryptoKey | null = null;

async function getSigningKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const secret = process.env.QR_HMAC_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "QR_HMAC_SECRET is missing or too short. Generate with: openssl rand -base64 48"
    );
  }

  cachedKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  return cachedKey;
}

async function hmacSign(input: string): Promise<string> {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(input)
  );
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signQrPayload(payload: QrPayload): Promise<string> {
  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const signingInput = `${TOKEN_VERSION}.${payloadB64}`;
  const signatureB64 = await hmacSign(signingInput);
  return `${signingInput}.${signatureB64}`;
}

export interface VehicleQrInput {
  registrationNumber: string;
  vic: string | null;
  permitNumber: string | null;
  permitStatus: string | null;
  permitExpiryDate: string | null;
}

export async function signVehicleQr(vehicle: VehicleQrInput): Promise<string> {
  const payload: VehicleQrPayload = {
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
  };
  return signQrPayload(payload);
}
