/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unified API response helpers.
 *
 * Success:
 *   { ok: true, data, ...dataFields, meta? }
 *   Object payloads are also spread at the top level so older clients that
 *   read `res.marshals` / `res.user` keep working during migration.
 *
 * Failure:
 *   { ok: false, error, code, details? }
 */

import { NextResponse } from "next/server";
import { AppError, type ErrorCode } from "./errors";
import type { PageMeta } from "@/lib/pagination";

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: PageMeta & Record<string, unknown>;
} & (T extends Record<string, unknown> ? T : Record<string, never>);

export type ApiFailure = {
  ok: false;
  error: string;
  code: ErrorCode;
  details?: Record<string, unknown>;
};

const NO_STORE = { "Cache-Control": "no-store" } as const;

export function ok<T>(
  data: T,
  init?: {
    status?: number;
    meta?: PageMeta & Record<string, unknown>;
    headers?: HeadersInit;
  }
): NextResponse {
  const spread =
    data !== null && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};

  const body = {
    ok: true as const,
    data,
    ...spread,
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
    console.error(
      "[api]",
      appErr.message,
      (appErr as Error & { cause?: unknown }).cause ?? ""
    );
  }
  const json = appErr.toJSON();
  return NextResponse.json(
    { ok: false as const, ...json },
    {
      status: appErr.httpStatus,
      headers: { ...NO_STORE, ...headers },
    }
  );
}

export function page<T>(
  items: T[],
  meta: PageMeta,
  extra?: Record<string, unknown>
): NextResponse {
  return ok({ items, ...extra }, { meta });
}

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
