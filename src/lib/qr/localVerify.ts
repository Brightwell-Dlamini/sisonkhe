/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Offline / local signature check (browser-safe).
 *
 * Verifies the cryptographic signature and decodes the snapshot payload.
 * Does NOT check live registry status — that requires /api/qr/verify.
 *
 * v2 (Ed25519): verified when NEXT_PUBLIC_QR_ED25519_PUBLIC_KEY is set.
 * v1 (HMAC): cannot be verified client-side without the secret — returns
 *   signatureUnchecked with decoded payload only.
 */

import {
  TOKEN_VERSION_V1,
  TOKEN_VERSION_V2,
  fromBase64Url,
  fromBase64UrlBytes,
  isQrPayload,
  isVehicleQrPayload,
  isOperatorQrPayload,
  isDriverQrPayload,
  type QrPayload,
} from "./payload";

export type LocalVerifyResult =
  | {
      ok: true;
      signatureValid: true;
      tokenVersion: string;
      payload: QrPayload;
      snapshot: Record<string, string | null>;
      issuedAt: string;
      note: string;
    }
  | {
      ok: true;
      signatureValid: false;
      signatureUnchecked: true;
      tokenVersion: string;
      payload: QrPayload;
      snapshot: Record<string, string | null>;
      issuedAt: string;
      note: string;
    }
  | {
      ok: false;
      reason: string;
      message: string;
    };

function snapshotFromPayload(payload: QrPayload): Record<string, string | null> {
  if (isVehicleQrPayload(payload)) {
    return {
      plate: payload.r,
      vic: payload.v || null,
      permit: payload.p || null,
      statusSnapshot: payload.s || null,
      expirySnapshot: payload.e || null,
      revision: payload.rev ?? null,
    };
  }
  if (isOperatorQrPayload(payload)) {
    return {
      id: payload.id,
      name: payload.n,
      licence: payload.l || null,
    };
  }
  if (isDriverQrPayload(payload)) {
    return {
      id: payload.id,
      name: payload.n,
      pdpStatusSnapshot: payload.s || null,
      pdpExpirySnapshot: payload.e || null,
    };
  }
  return {};
}

async function importSpkiPublicKey(spkiBase64: string): Promise<CryptoKey> {
  let b64 = spkiBase64.trim().replace(/\s+/g, "");
  // tolerate url-safe
  b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return crypto.subtle.importKey("spki", bytes, { name: "Ed25519" }, false, [
    "verify",
  ]);
}

async function verifyEd25519(
  signingInput: string,
  signatureB64: string,
  spkiBase64: string
): Promise<boolean> {
  try {
    const key = await importSpkiPublicKey(spkiBase64);
    const sig = fromBase64UrlBytes(signatureB64);
    return await crypto.subtle.verify(
      "Ed25519",
      key,
      sig,
      new TextEncoder().encode(signingInput)
    );
  } catch (err) {
    console.warn("[qr/localVerify] Ed25519 verify failed:", err);
    return false;
  }
}

/**
 * Local-only verify. Safe to call offline.
 * Set NEXT_PUBLIC_QR_ED25519_PUBLIC_KEY to enable real signature checks for v2.
 */
export async function localVerifyQrToken(
  token: string
): Promise<LocalVerifyResult> {
  if (!token || typeof token !== "string") {
    return { ok: false, reason: "MALFORMED", message: "Empty token." };
  }

  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    return {
      ok: false,
      reason: "MALFORMED",
      message: "Token must have 3 parts.",
    };
  }

  const [version, payloadB64, signatureB64] = parts;
  if (version !== TOKEN_VERSION_V1 && version !== TOKEN_VERSION_V2) {
    return {
      ok: false,
      reason: "UNKNOWN_VERSION",
      message: `Unknown version ${version}`,
    };
  }

  let payload: QrPayload;
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(payloadB64!));
    if (!isQrPayload(parsed)) {
      return {
        ok: false,
        reason: "INVALID_PAYLOAD",
        message: "Payload schema mismatch.",
      };
    }
    payload = parsed;
  } catch {
    return {
      ok: false,
      reason: "INVALID_PAYLOAD",
      message: "Could not decode payload.",
    };
  }

  const issuedAt = new Date(payload.i * 1000).toISOString();
  const snapshot = snapshotFromPayload(payload);
  const signingInput = `${version}.${payloadB64}`;

  if (version === TOKEN_VERSION_V2) {
    const pub =
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_QR_ED25519_PUBLIC_KEY?.trim()
        : undefined;
    // Also try runtime injection via window for flexibility
    const pubKey =
      pub ||
      (typeof window !== "undefined"
        ? (window as unknown as { __QR_PUB__?: string }).__QR_PUB__
        : undefined);

    if (!pubKey) {
      return {
        ok: true,
        signatureValid: false,
        signatureUnchecked: true,
        tokenVersion: version,
        payload,
        snapshot,
        issuedAt,
        note: "Public key not configured — snapshot only. Live status needs network.",
      };
    }

    const good = await verifyEd25519(signingInput, signatureB64!, pubKey);
    if (!good) {
      return {
        ok: false,
        reason: "BAD_SIGNATURE",
        message: "Ed25519 signature invalid (forged or wrong key).",
      };
    }

    return {
      ok: true,
      signatureValid: true,
      tokenVersion: version,
      payload,
      snapshot,
      issuedAt,
      note: "Signature valid offline. Confirm live permit status when online.",
    };
  }

  // v1 HMAC — secret must never ship to the client
  return {
    ok: true,
    signatureValid: false,
    signatureUnchecked: true,
    tokenVersion: version,
    payload,
    snapshot,
    issuedAt,
    note: "Legacy HMAC token — signature checked only on the server. Snapshot decoded offline.",
  };
}
