/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QR verification — signature + live registry state.
 * A valid signature does NOT mean currently legal.
 */

import "server-only";
import {
  TOKEN_VERSION,
  fromBase64Url,
  isQrPayload,
  isVehicleQrPayload,
  isOperatorQrPayload,
  isDriverQrPayload,
  type QrPayload,
} from "./payload";
import { createSupabaseAdminClient } from "../supabase/server";
import { logQrScan } from "./audit";

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

export type VerifyFailureReason =
  | "MALFORMED"
  | "UNKNOWN_VERSION"
  | "BAD_SIGNATURE"
  | "INVALID_PAYLOAD"
  | "VEHICLE_NOT_FOUND"
  | "OPERATOR_NOT_FOUND"
  | "DRIVER_NOT_FOUND"
  | "PERMIT_SUSPENDED"
  | "PERMIT_EXPIRED"
  | "PERMIT_SUPERSEDED"
  | "PDP_INVALID"
  | "PDP_EXPIRED"
  | "QR_TOO_OLD";

export interface VerifySuccess {
  valid: true;
  entityType: "vehicle" | "operator" | "driver";
  payload: QrPayload;
  /** Human-facing summary fields (public-safe). */
  summary: Record<string, string | null>;
  permitStatus?: string;
  permitExpiry?: string | null;
  issuedAt: string;
}

export interface VerifyFailure {
  valid: false;
  reason: VerifyFailureReason;
  message: string;
  entityType?: "vehicle" | "operator" | "driver";
  payload?: QrPayload;
  summary?: Record<string, string | null>;
}

export type VerifyResult = VerifySuccess | VerifyFailure;

export interface VerifyOptions {
  source?: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  userAgent?: string | null;
  ipHint?: string | null;
}

/** Absolute max age for any token (3 years). Live status still gates legality. */
const MAX_AGE_SECONDS = 3 * 365 * 24 * 60 * 60;

function entityKeyFromPayload(payload: QrPayload): string {
  if (isVehicleQrPayload(payload)) return payload.r;
  return payload.id;
}

async function finish(
  result: VerifyResult,
  options?: VerifyOptions
): Promise<VerifyResult> {
  const payload = "payload" in result ? result.payload : undefined;
  void logQrScan({
    valid: result.valid,
    reason: result.valid ? null : result.reason,
    entityType: result.valid
      ? result.entityType
      : result.entityType ?? (payload ? payload.t : null),
    entityKey: payload ? entityKeyFromPayload(payload) : null,
    source: options?.source ?? "api",
    actorUserId: options?.actorUserId,
    actorRole: options?.actorRole,
    userAgent: options?.userAgent,
    ipHint: options?.ipHint,
  });
  return result;
}

export async function verifyQrToken(
  token: string,
  options?: VerifyOptions
): Promise<VerifyResult> {
  if (!token || typeof token !== "string") {
    return finish(
      { valid: false, reason: "MALFORMED", message: "Empty or non-string token." },
      options
    );
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return finish(
      {
        valid: false,
        reason: "MALFORMED",
        message: "Token must have 3 parts separated by dots.",
      },
      options
    );
  }

  const [version, payloadB64, signatureB64] = parts;

  if (version !== TOKEN_VERSION) {
    return finish(
      {
        valid: false,
        reason: "UNKNOWN_VERSION",
        message: `Unknown token version: ${version}`,
      },
      options
    );
  }

  const signingInput = `${version}.${payloadB64}`;
  const signatureOk = await hmacVerify(signingInput, signatureB64!);
  if (!signatureOk) {
    return finish(
      {
        valid: false,
        reason: "BAD_SIGNATURE",
        message:
          "Signature verification failed. Token may be forged or tampered with.",
      },
      options
    );
  }

  let payload: QrPayload;
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(payloadB64!));
    if (!isQrPayload(parsed)) {
      return finish(
        {
          valid: false,
          reason: "INVALID_PAYLOAD",
          message: "Payload does not match expected schema.",
        },
        options
      );
    }
    payload = parsed;
  } catch {
    return finish(
      {
        valid: false,
        reason: "INVALID_PAYLOAD",
        message: "Could not decode payload JSON.",
      },
      options
    );
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.i > nowSec + 300) {
    return finish(
      {
        valid: false,
        reason: "QR_TOO_OLD",
        message: "Token issued in the future — clock skew or tampering.",
        entityType: payload.t,
        payload,
      },
      options
    );
  }
  if (nowSec - payload.i > MAX_AGE_SECONDS) {
    return finish(
      {
        valid: false,
        reason: "QR_TOO_OLD",
        message: "Token is older than the 3-year maximum. Reprint the document.",
        entityType: payload.t,
        payload,
      },
      options
    );
  }

  const admin = createSupabaseAdminClient();

  if (isVehicleQrPayload(payload)) {
    const { data: vehicle, error } = await admin
      .from("vehicles")
      .select(
        "registration_number, vic, permit_number, permit_status, permit_expiry_date, make, model, classification"
      )
      .eq("registration_number", payload.r)
      .maybeSingle();

    if (error) {
      console.error("[qr/verify] vehicle lookup error:", error);
      return finish(
        {
          valid: false,
          reason: "VEHICLE_NOT_FOUND",
          message: "Could not query the vehicle registry.",
          entityType: "vehicle",
          payload,
        },
        options
      );
    }

    if (!vehicle) {
      return finish(
        {
          valid: false,
          reason: "VEHICLE_NOT_FOUND",
          message: `Vehicle ${payload.r} is not in the current registry.`,
          entityType: "vehicle",
          payload,
        },
        options
      );
    }

    const livePermitStatus =
      (vehicle.permit_status as string | null) ?? "Active";
    const livePermitExpiry =
      (vehicle.permit_expiry_date as string | null) ?? null;
    const livePermitNumber =
      (vehicle.permit_number as string | null) ?? "";

    if (
      payload.p &&
      livePermitNumber &&
      payload.p.trim().toUpperCase() !== livePermitNumber.trim().toUpperCase()
    ) {
      return finish(
        {
          valid: false,
          reason: "PERMIT_SUPERSEDED",
          message:
            "This QR was issued for an older permit number. Reprint the current permit.",
          entityType: "vehicle",
          payload,
          summary: {
            plate: payload.r,
            permitOnToken: payload.p,
            permitLive: livePermitNumber,
          },
        },
        options
      );
    }

    if (livePermitStatus === "Suspended") {
      return finish(
        {
          valid: false,
          reason: "PERMIT_SUSPENDED",
          message: "Vehicle permit is currently suspended.",
          entityType: "vehicle",
          payload,
          summary: { plate: payload.r, status: livePermitStatus },
        },
        options
      );
    }

    if (livePermitExpiry) {
      const expiry = new Date(livePermitExpiry);
      if (!Number.isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
        return finish(
          {
            valid: false,
            reason: "PERMIT_EXPIRED",
            message: `Vehicle permit expired on ${livePermitExpiry}.`,
            entityType: "vehicle",
            payload,
            summary: {
              plate: payload.r,
              expiry: livePermitExpiry,
              status: livePermitStatus,
            },
          },
          options
        );
      }
    }

    return finish(
      {
        valid: true,
        entityType: "vehicle",
        payload,
        summary: {
          plate: vehicle.registration_number as string,
          vic: (vehicle.vic as string | null) ?? null,
          permit: livePermitNumber || null,
          make: (vehicle.make as string | null) ?? null,
          model: (vehicle.model as string | null) ?? null,
          classification: (vehicle.classification as string | null) ?? null,
          status: livePermitStatus,
          expiry: livePermitExpiry,
        },
        permitStatus: livePermitStatus,
        permitExpiry: livePermitExpiry,
        issuedAt: new Date(payload.i * 1000).toISOString(),
      },
      options
    );
  }

  if (isOperatorQrPayload(payload)) {
    const { data: op, error } = await admin
      .from("fleet_operators")
      .select("id, name, company_name, operator_license_number, phone")
      .eq("id", payload.id)
      .maybeSingle();

    if (error || !op) {
      return finish(
        {
          valid: false,
          reason: "OPERATOR_NOT_FOUND",
          message: "Operator is not in the current registry.",
          entityType: "operator",
          payload,
        },
        options
      );
    }

    return finish(
      {
        valid: true,
        entityType: "operator",
        payload,
        summary: {
          id: op.id as string,
          name: op.name as string,
          company: (op.company_name as string | null) ?? null,
          licence: (op.operator_license_number as string | null) ?? null,
        },
        issuedAt: new Date(payload.i * 1000).toISOString(),
      },
      options
    );
  }

  if (isDriverQrPayload(payload)) {
    const { data: driver, error } = await admin
      .from("drivers")
      .select(
        "id, full_name, pdp_status, pdp_expiry_date, status, assigned_vehicle_reg"
      )
      .eq("id", payload.id)
      .maybeSingle();

    if (error || !driver) {
      return finish(
        {
          valid: false,
          reason: "DRIVER_NOT_FOUND",
          message: "Driver is not in the current registry.",
          entityType: "driver",
          payload,
        },
        options
      );
    }

    const pdpStatus = (driver.pdp_status as string | null) ?? "Valid";
    const pdpExpiry = (driver.pdp_expiry_date as string | null) ?? null;
    const driverStatus = (driver.status as string | null) ?? "Active";

    if (
      driverStatus === "Suspended" ||
      pdpStatus.toLowerCase() === "invalid" ||
      pdpStatus.toLowerCase() === "suspended"
    ) {
      return finish(
        {
          valid: false,
          reason: "PDP_INVALID",
          message: "Driver PDP / status is not valid.",
          entityType: "driver",
          payload,
          summary: {
            name: driver.full_name as string,
            pdpStatus,
            status: driverStatus,
          },
        },
        options
      );
    }

    if (pdpExpiry) {
      const exp = new Date(pdpExpiry);
      if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
        return finish(
          {
            valid: false,
            reason: "PDP_EXPIRED",
            message: `Driver PDP expired on ${pdpExpiry}.`,
            entityType: "driver",
            payload,
            summary: {
              name: driver.full_name as string,
              pdpExpiry,
              pdpStatus,
            },
          },
          options
        );
      }
    }

    return finish(
      {
        valid: true,
        entityType: "driver",
        payload,
        summary: {
          id: driver.id as string,
          name: driver.full_name as string,
          pdpStatus,
          pdpExpiry,
          status: driverStatus,
          assignedVehicle:
            (driver.assigned_vehicle_reg as string | null) ?? null,
        },
        issuedAt: new Date(payload.i * 1000).toISOString(),
      },
      options
    );
  }

  return finish(
    {
      valid: false,
      reason: "INVALID_PAYLOAD",
      message: "Unsupported entity type.",
    },
    options
  );
}
