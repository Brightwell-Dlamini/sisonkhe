/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ed25519 signing keys (server) + public key export for clients.
 *
 * Env:
 *   QR_ED25519_PRIVATE_KEY  base64 PKCS8 DER (required for v2 issue)
 *   QR_ED25519_PUBLIC_KEY   base64 SPKI DER  (optional; derived if missing)
 *   QR_ED25519_KID          key id string, default "k1"
 *   QR_HMAC_SECRET          still used only to *verify* legacy v1 tokens
 *
 * Generate a keypair:
 *   node -e "const {generateKeyPairSync}=require('crypto');
 *     const {publicKey,privateKey}=generateKeyPairSync('ed25519');
 *     console.log('QR_ED25519_PRIVATE_KEY='+privateKey.export({type:'pkcs8',format:'der'}).toString('base64'));
 *     console.log('NEXT_PUBLIC_QR_ED25519_PUBLIC_KEY='+publicKey.export({type:'spki',format:'der'}).toString('base64'));"
 */

import "server-only";
import {
  createPrivateKey,
  createPublicKey,
  type KeyObject,
} from "node:crypto";

export function getQrKeyId(): string {
  return (process.env.QR_ED25519_KID ?? "k1").trim() || "k1";
}

function decodeKeyMaterial(raw: string): Buffer {
  const trimmed = raw.trim().replace(/\s+/g, "");
  // Accept raw base64 or PEM
  if (trimmed.includes("BEGIN")) {
    return Buffer.from(trimmed, "utf8");
  }
  return Buffer.from(trimmed, "base64");
}

let cachedPrivate: KeyObject | null = null;
let cachedPublic: KeyObject | null = null;

export function hasEd25519PrivateKey(): boolean {
  const v = process.env.QR_ED25519_PRIVATE_KEY?.trim();
  return Boolean(v && v.length > 16);
}

export function getEd25519PrivateKey(): KeyObject {
  if (cachedPrivate) return cachedPrivate;
  const raw = process.env.QR_ED25519_PRIVATE_KEY?.trim();
  if (!raw || raw.length < 16) {
    throw new Error(
      "QR_ED25519_PRIVATE_KEY is missing. Generate with node crypto ed25519 (see .env.example)."
    );
  }
  try {
    if (raw.includes("BEGIN")) {
      cachedPrivate = createPrivateKey(raw);
    } else {
      cachedPrivate = createPrivateKey({
        key: decodeKeyMaterial(raw),
        format: "der",
        type: "pkcs8",
      });
    }
    return cachedPrivate;
  } catch (err) {
    throw new Error(
      `QR_ED25519_PRIVATE_KEY is invalid: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export function getEd25519PublicKey(): KeyObject {
  if (cachedPublic) return cachedPublic;

  const raw =
    process.env.QR_ED25519_PUBLIC_KEY?.trim() ||
    process.env.NEXT_PUBLIC_QR_ED25519_PUBLIC_KEY?.trim();

  if (raw && raw.length > 16) {
    try {
      if (raw.includes("BEGIN")) {
        cachedPublic = createPublicKey(raw);
      } else {
        cachedPublic = createPublicKey({
          key: decodeKeyMaterial(raw),
          format: "der",
          type: "spki",
        });
      }
      return cachedPublic;
    } catch (err) {
      console.warn("[qr/keys] public key parse failed, deriving from private:", err);
    }
  }

  // Derive from private when public not configured
  const priv = getEd25519PrivateKey();
  cachedPublic = createPublicKey(priv);
  return cachedPublic;
}

/** SPKI DER base64 — safe to embed as NEXT_PUBLIC_ for offline client verify. */
export function getEd25519PublicKeySpkiBase64(): string {
  const pub = getEd25519PublicKey();
  return pub.export({ type: "spki", format: "der" }).toString("base64");
}
