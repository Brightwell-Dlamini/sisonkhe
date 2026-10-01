/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MTN Mobile Money (MoMo) Collections API.
 *
 * Docs: https://momodeveloper.mtn.com/api-documentation
 *
 * Flow:
 *   1. Obtain an OAuth bearer token from /collection/token/
 *   2. POST /collection/v1_0/requesttopay with X-Reference-Id
 *   3. User receives STK push, approves on phone
 *   4. Provider calls our webhook, or we poll /requesttopay/{ref}
 */

import "server-only";
import type {
  PaymentProvider,
  InitiateParams,
  InitiateResult,
  ProviderStatusResult,
  WebhookParseResult,
  PaymentStatus,
} from "../types";

const TOKEN_CACHE: { token: string | null; expiresAt: number } = {
  token: null,
  expiresAt: 0,
};

function env(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (TOKEN_CACHE.token && TOKEN_CACHE.expiresAt > now + 30_000) {
    return TOKEN_CACHE.token;
  }

  const subscriptionKey = env("MOMO_SUBSCRIPTION_KEY");
  const apiUser = env("MOMO_API_USER");
  const apiKey = env("MOMO_API_KEY");
  const baseUrl = env("MOMO_BASE_URL");

  const basic = Buffer.from(`${apiUser}:${apiKey}`).toString("base64");

  const res = await fetch(`${baseUrl}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MoMo token error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const token = data.access_token as string;
  const expiresIn = Number(data.expires_in ?? 3600);

  TOKEN_CACHE.token = token;
  TOKEN_CACHE.expiresAt = now + expiresIn * 1000;

  return token;
}

function normalizePhone(phone: string): string {
  // MoMo requires MSISDN without +, without leading 0, with country code
  // Eswatini country code is 268
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("268")) return digits;
  if (digits.startsWith("0")) return "268" + digits.slice(1);
  if (digits.length === 8) return "268" + digits;
  return digits;
}

function mapMomoStatus(momoStatus: string): PaymentStatus {
  switch (momoStatus.toUpperCase()) {
    case "SUCCESSFUL":
      return "completed";
    case "FAILED":
      return "failed";
    case "PENDING":
      return "pending";
    case "REJECTED":
    case "TIMEOUT":
      return "failed";
    case "CANCELLED":
      return "cancelled";
    default:
      return "processing";
  }
}

export const momoProvider: PaymentProvider = {
  id: "momo",
  displayName: "MTN Mobile Money",
  supportsWebhooks: true,
  requiresPayerPhone: true,

  enabled() {
    return Boolean(
      process.env.MOMO_SUBSCRIPTION_KEY &&
        process.env.MOMO_API_USER &&
        process.env.MOMO_API_KEY &&
        process.env.MOMO_BASE_URL
    );
  },

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    if (!params.payerPhone) {
      throw new Error("MoMo requires a payer phone number.");
    }

    const token = await getAccessToken();
    const baseUrl = env("MOMO_BASE_URL");
    const subscriptionKey = env("MOMO_SUBSCRIPTION_KEY");
    const callbackUrl = process.env.MOMO_CALLBACK_URL ?? "";

    const referenceId = crypto.randomUUID();
    const msisdn = normalizePhone(params.payerPhone);

    const body = {
      amount: String(params.amountSzl.toFixed(2)),
      currency: "ZAR", // MoMo Eswatini uses ZAR pegged at 1:1 with SZL
      externalId: params.clientReference,
      payer: {
        partyIdType: "MSISDN",
        partyId: msisdn,
      },
      payerMessage: (params.description ?? "Sisonkhe In Transit top-up").slice(0, 60),
      payeeNote: "Sisonkhe master card top-up",
    };

    const res = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Reference-Id": referenceId,
        "X-Target-Environment": env("MOMO_TARGET_ENVIRONMENT"),
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Content-Type": "application/json",
        ...(callbackUrl ? { "X-Callback-Url": callbackUrl } : {}),
      },
      body: JSON.stringify(body),
    });

    if (res.status !== 202) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `MoMo requesttopay failed ${res.status}: ${text.slice(0, 300)}`
      );
    }

    return {
      providerReference: referenceId,
      status: "pending",
      instructions: `Check your phone (${msisdn}) — a MoMo prompt has been sent. Approve to complete the payment.`,
      rawResponse: { referenceId, msisdn, amount: body.amount, currency: body.currency },
    };
  },

  async checkStatus(providerReference: string): Promise<ProviderStatusResult> {
    const token = await getAccessToken();
    const baseUrl = env("MOMO_BASE_URL");
    const subscriptionKey = env("MOMO_SUBSCRIPTION_KEY");

    const res = await fetch(
      `${baseUrl}/collection/v1_0/requesttopay/${providerReference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Target-Environment": env("MOMO_TARGET_ENVIRONMENT"),
          "Ocp-Apim-Subscription-Key": subscriptionKey,
        },
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`MoMo checkStatus ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    return {
      status: mapMomoStatus(data.status ?? ""),
      failureReason: data.reason as string | undefined,
      rawResponse: data,
    };
  },

  parseWebhook(payload: unknown): WebhookParseResult | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as Record<string, unknown>;

    const referenceId = (p.referenceId ?? p.externalId ?? "") as string;
    const status = (p.status ?? "") as string;
    if (!referenceId || !status) return null;

    return {
      providerReference: referenceId,
      clientReference: (p.externalId as string) ?? undefined,
      status: mapMomoStatus(status),
      failureReason: (p.reason as string) ?? undefined,
      rawPayload: p,
    };
  },
};
