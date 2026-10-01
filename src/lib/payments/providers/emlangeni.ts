/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * e-Mlangeni (Eswatini Mobile) payment provider.
 *
 * NOTE: Eswatini Mobile's public API is documented as USSD-redirect based.
 * The exact endpoint paths here are placeholders that match the shape their
 * merchant documentation describes. Confirm with your Eswatini Mobile
 * business contact before going live, and update the URLs accordingly.
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

function env(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("268")) return digits;
  if (digits.startsWith("0")) return "268" + digits.slice(1);
  if (digits.length === 8) return "268" + digits;
  return digits;
}

function mapStatus(s: string): PaymentStatus {
  switch (s.toLowerCase()) {
    case "completed":
    case "success":
    case "successful":
      return "completed";
    case "failed":
      return "failed";
    case "pending":
      return "pending";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "expired":
      return "expired";
    default:
      return "processing";
  }
}

export const emlangeniProvider: PaymentProvider = {
  id: "emlangeni",
  displayName: "e-Mlangeni (Eswatini Mobile)",
  supportsWebhooks: true,
  requiresPayerPhone: true,

  enabled() {
    return Boolean(
      process.env.EMLANGENI_API_KEY &&
        process.env.EMLANGENI_MERCHANT_ID &&
        process.env.EMLANGENI_BASE_URL
    );
  },

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    if (!params.payerPhone) {
      throw new Error("e-Mlangeni requires a payer phone number.");
    }

    const baseUrl = env("EMLANGENI_BASE_URL");
    const apiKey = env("EMLANGENI_API_KEY");
    const merchantId = env("EMLANGENI_MERCHANT_ID");
    const callbackUrl = process.env.EMLANGENI_CALLBACK_URL ?? "";

    const body = {
      merchantId,
      amount: params.amountSzl.toFixed(2),
      currency: "SZL",
      msisdn: normalizePhone(params.payerPhone),
      reference: params.clientReference,
      description: params.description ?? "Sisonkhe master card top-up",
      ...(callbackUrl ? { callbackUrl } : {}),
    };

    const res = await fetch(`${baseUrl}/v1/payments/initiate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `e-Mlangeni initiate failed ${res.status}: ${text.slice(0, 300)}`
      );
    }

    const data = await res.json();

    return {
      providerReference: (data.transactionId ?? data.id ?? "") as string,
      status: mapStatus((data.status as string) ?? "pending"),
      redirectUrl: (data.redirectUrl as string) ?? undefined,
      instructions:
        (data.instructions as string) ??
        `Check your phone for a USSD prompt from Eswatini Mobile to approve E${params.amountSzl.toFixed(2)}.`,
      rawResponse: data,
    };
  },

  async checkStatus(providerReference: string): Promise<ProviderStatusResult> {
    const baseUrl = env("EMLANGENI_BASE_URL");
    const apiKey = env("EMLANGENI_API_KEY");

    const res = await fetch(
      `${baseUrl}/v1/payments/${encodeURIComponent(providerReference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `e-Mlangeni checkStatus ${res.status}: ${text.slice(0, 200)}`
      );
    }

    const data = await res.json();
    return {
      status: mapStatus((data.status as string) ?? ""),
      failureReason: data.failureReason as string | undefined,
      rawResponse: data,
    };
  },

  parseWebhook(payload: unknown): WebhookParseResult | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as Record<string, unknown>;

    const transactionId = (p.transactionId ?? p.id ?? "") as string;
    const status = (p.status ?? "") as string;
    if (!transactionId || !status) return null;

    return {
      providerReference: transactionId,
      clientReference: (p.reference as string) ?? undefined,
      status: mapStatus(status),
      failureReason: (p.failureReason as string) ?? undefined,
      rawPayload: p,
    };
  },
};
