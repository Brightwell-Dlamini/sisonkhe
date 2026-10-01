/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useEffect, useState } from "react";
import {
  countPending,
  countFailed,
  subscribeOutbox,
} from "../lib/offline/outbox";

interface OutboxState {
  pending: number;
  failed: number;
  loading: boolean;
}

export function useOutbox(): OutboxState {
  const [state, setState] = useState<OutboxState>({
    pending: 0,
    failed: 0,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const [pending, failed] = await Promise.all([
          countPending(),
          countFailed(),
        ]);
        if (!cancelled) setState({ pending, failed, loading: false });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      }
    };

    void refresh();
    const unsub = subscribeOutbox(refresh);

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return state;
}
