/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useEffect, useState } from "react";
import { isOnline, subscribeNetwork } from "../lib/offline/network";

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() => isOnline());

  useEffect(() => {
    setOnline(isOnline());
    return subscribeNetwork((next) => setOnline(next));
  }, []);

  return online;
}
