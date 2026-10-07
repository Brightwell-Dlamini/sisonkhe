/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unified API response helpers.
 *
 * Every route should return through these so clients see a consistent envelope:
 *   success → { ok: true, data, meta? }
 *   failure → { ok: false, error, code, details? }
 *
 * List endpoints that paginate also include meta from buildPageMeta.
 */

import { NextResponse } from "next/server";
import { AppError, type ErrorCode } from "./errors";
import type { PageMeta } from "@/lib/pagination";

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: PageMeta & Record<string, unknown>;
};

export type ApiFailure = {
  ok: false;
  error: string;
  code: ErrorCode;
  details?: Record<string, unknown>;
};

export type ApiBody<T> = ApiSuccess<T> | ApiFailure;

const NO_STORE = { "Cache-Control": "no-store" } as const;

export function ok<T>(
  data: T,
  init?: {
    status?: number;
    meta?: PageMeta & Record<string, unknown>;
    headers?: HeadersInit;
  }
): NextResponse {
  const body: ApiSuccess<T> = {
    ok: true,
    data,
    ...(init?.meta ? { meta: init.meta } : {}),
  };
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: { ...NO_STORE, ...init?.headers },
  });
}

export function fail(err: unknown, headers?: HeadersInit): NextResponse {
  const appErr = AppError.fromUnknown(err);
  if (appErr.code === "INTERNAL") {
    console.error("[api]", appErr.message, (appErr as Error & { cause?: unknown }).cause ?? "");
  }
  return NextResponse.json(appErr.toJSON() as ApiFailure & { ok: false }, {
    status: appErr.httpStatus,
    headers: { ...NO_STORE, ...headers },
  });
}

/** Convenience for paginated lists. */
export function page<T>(
  items: T[],
  meta: PageMeta,
  extra?: Record<string, unknown>
): NextResponse {
  return ok({ items, ...extra }, { meta });
}

/**
 * Wrap an async route handler so every thrown value becomes a typed ApiFailure.
 * Usage:
 *   export const GET = withApiHandler(async (req) => { ... return ok(data); });
 */
export function withApiHandler<
  Args extends unknown[],
>(
  handler: (...args: Args) => Promise<NextResponse>
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      return fail(err);
    }
  };
}
