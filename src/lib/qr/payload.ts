/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QR token payload schema and encoding.
 *
 * Token formats:
 *   v1.<base64url(payloadJSON)>.<base64url(hmac-sha256)>   — legacy HMAC
 *   v2.<base64url(payloadJSON)>.<base64url(ed25519-sig)>   — Ed25519 (preferred)
 */

export const TOKEN_VERSION_V1 = "v1";
export const TOKEN_VERSION_V2 = "v2";
/** @deprecated use TOKEN_VERSION_V2 for new issues */
export const TOKEN_VERSION = TOKEN_VERSION_V2;

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
  /**
   * Permit revision identity. Prefer explicit registry revision when present;
   * otherwise `${permitNumber}|${expiry}` so a re-issue with new permit/expiry
   * supersedes older QRs even if the plate is unchanged.
   */
  rev?: string;
  /** Signing key id for rotation (v2). */
  kid?: string;
}

/** Fleet operator identity QR. */
export interface OperatorQrPayload {
  t: "operator";
  id: string;
  n: string;
  l: string;
  i: number;
  kid?: string;
}

/** Driver identity / PDP QR. */
export interface DriverQrPayload {
  t: "driver";
  id: string;
  n: string;
  s: string;
  e: string;
  i: number;
  kid?: string;
}

export type QrPayload = VehicleQrPayload | OperatorQrPayload | DriverQrPayload;

/** Stable revision string used when the DB has no dedicated revision column. */
export function buildPermitRevision(
  permitNumber: string | null | undefined,
  permitExpiryDate: string | null | undefined
): string {
  const p = (permitNumber ?? "").trim().toUpperCase();
  const e = (permitExpiryDate ?? "").trim();
  return `${p}|${e}`;
}

export function toBase64Url(input: string | Uint8Array): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
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

export function fromBase64UrlBytes(input: string): Uint8Array {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function hasRequiredStrings(
  o: Record<string, unknown>,
  keys: string[]
): boolean {
  return keys.every((k) => typeof o[k] === "string");
}

export function isVehicleQrPayload(x: unknown): x is VehicleQrPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (
    o.t !== "vehicle" ||
    !hasRequiredStrings(o, ["r", "v", "p", "s", "e"]) ||
    typeof o.i !== "number"
  ) {
    return false;
  }
  if (o.rev !== undefined && typeof o.rev !== "string") return false;
  if (o.kid !== undefined && typeof o.kid !== "string") return false;
  return true;
}

export function isOperatorQrPayload(x: unknown): x is OperatorQrPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (
    o.t !== "operator" ||
    !hasRequiredStrings(o, ["id", "n", "l"]) ||
    typeof o.i !== "number"
  ) {
    return false;
  }
  if (o.kid !== undefined && typeof o.kid !== "string") return false;
  return true;
}

export function isDriverQrPayload(x: unknown): x is DriverQrPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (
    o.t !== "driver" ||
    !hasRequiredStrings(o, ["id", "n", "s", "e"]) ||
    typeof o.i !== "number"
  ) {
    return false;
  }
  if (o.kid !== undefined && typeof o.kid !== "string") return false;
  return true;
}

export function isQrPayload(x: unknown): x is QrPayload {
  return isVehicleQrPayload(x) || isOperatorQrPayload(x) || isDriverQrPayload(x);
}
