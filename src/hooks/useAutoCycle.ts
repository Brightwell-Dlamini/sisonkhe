/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auto-cycles through a page index at a fixed interval, pausing when the
 * document is hidden.
 */

"use client";

import { useEffect, useState } from "react";

export function useAutoCycle(
  totalPages: number,
  intervalMs: number = 12000,
  enabled: boolean = true
): { pageIndex: number; setPageIndex: (idx: number) => void; paused: boolean; setPaused: (p: boolean) => void } {
  const [pageIndex, setPageIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Reset if data shrinks
  useEffect(() => {
    if (pageIndex >= totalPages) setPageIndex(0);
  }, [totalPages, pageIndex]);

  useEffect(() => {
    if (!enabled || paused || totalPages <= 1) return;

    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        setPageIndex((prev) => (prev + 1) % totalPages);
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [totalPages, intervalMs, enabled, paused]);

  return { pageIndex, setPageIndex, paused, setPaused };
}
