/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared list pagination helpers for API routes and admin lists.
 */

export interface PageParams {
  page: number;
  limit: number;
  offset: number;
}

export type PageMeta = Record<string, unknown> & {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Parse page/limit from URLSearchParams or a plain object.
 * 1-based page numbers.
 */
export function parsePageParams(
  source: URLSearchParams | Record<string, string | string[] | undefined>,
  defaults?: { limit?: number; maxLimit?: number }
): PageParams {
  const limitDefault = defaults?.limit ?? DEFAULT_LIMIT;
  const maxLimit = defaults?.maxLimit ?? MAX_LIMIT;

  const rawPage =
    source instanceof URLSearchParams
      ? source.get("page")
      : Array.isArray(source.page)
        ? source.page[0]
        : source.page;
  const rawLimit =
    source instanceof URLSearchParams
      ? source.get("limit")
      : Array.isArray(source.limit)
        ? source.limit[0]
        : source.limit;

  let page = Math.floor(Number(rawPage) || 1);
  if (!Number.isFinite(page) || page < 1) page = 1;

  let limit = Math.floor(Number(rawLimit) || limitDefault);
  if (!Number.isFinite(limit) || limit < 1) limit = limitDefault;
  if (limit > maxLimit) limit = maxLimit;

  return { page, limit, offset: (page - 1) * limit };
}

export function buildPageMeta(
  total: number,
  page: number,
  limit: number
): PageMeta {
  const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page * limit < total,
  };
}

/** Cursor helpers for seq-based or timestamp-based feeds. */
export function parseCursor(
  source: URLSearchParams | Record<string, string | string[] | undefined>,
  key = "cursor"
): string | null {
  const raw =
    source instanceof URLSearchParams
      ? source.get(key)
      : Array.isArray(source[key])
        ? source[key]![0]
        : (source[key] as string | undefined);
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseSinceSeq(
  source: URLSearchParams | Record<string, string | string[] | undefined>
): number {
  const raw =
    source instanceof URLSearchParams
      ? source.get("since") ?? source.get("sinceSeq")
      : (source.since as string | undefined) ??
      (source.sinceSeq as string | undefined);
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}
