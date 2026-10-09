/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QR token payload schema and encoding.
 *
 * Token format:
 *   v1.<base64url(payloadJSON)>.<base64url(hmac-sha256)>
 */

export const TOKEN_VERSION = "v1";

export type QrEntityType = "vehicle" | "operator" | "driver";

/** Vehicle / PSV permit QR (printed on permits). */
export interface VehicleQrPayload {
  t: "vehicle";
  /** Registration plate */
  r: string;
  /** VIC */
  v: string;
  /** Permit number */
  p: string;
  /** Permit status snapshot at issue */
  s: string;
  /** Permit expiry YYYY-MM-DD */
  e: string;
  /** Issued-at unix seconds */
  i: number;
}

/** Fleet operator identity QR. */
export interface OperatorQrPayload {
  t: "operator";
  /** Operator id */
  id: string;
  /** Display name */
  n: string;
  /** Operator licence number */
  l: string;
  /** Issued-at unix seconds */
  i: number;
}

/** Driver identity / PDP QR. */
export interface DriverQrPayload {
  t: "driver";
  /** Driver id */
  id: string;
  /** Full name */
  n: string;
  /** PDP status snapshot */
  s: string;
  /** PDP expiry YYYY-MM-DD */
  e: string;
  /** Issued-at unix seconds */
  i: number;
}

export type QrPayload = VehicleQrPayload | OperatorQrPayload | DriverQrPayload;

export function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(input: string): string {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function isVehicleQrPayload(x: unknown): x is VehicleQrPayload {
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

export function isOperatorQrPayload(x: unknown): x is OperatorQrPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    o.t === "operator" &&
    typeof o.id === "string" &&
    typeof o.n === "string" &&
    typeof o.l === "string" &&
    typeof o.i === "number"
  );
}

export function isDriverQrPayload(x: unknown): x is DriverQrPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    o.t === "driver" &&
    typeof o.id === "string" &&
    typeof o.n === "string" &&
    typeof o.s === "string" &&
    typeof o.e === "string" &&
    typeof o.i === "number"
  );
}

export function isQrPayload(x: unknown): x is QrPayload {
  return isVehicleQrPayload(x) || isOperatorQrPayload(x) || isDriverQrPayload(x);
}
