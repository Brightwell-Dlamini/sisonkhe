/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Reads Command Centre deep-link query params (?filter=&q=).
 */

"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export function useDeepLinkFilter() {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const filter = (searchParams.get("filter") ?? "").trim().toLowerCase();
    const q = (searchParams.get("q") ?? "").trim();
    const renewal = (searchParams.get("renewal") ?? "").trim();
    return { filter, q, renewal };
  }, [searchParams]);
}
