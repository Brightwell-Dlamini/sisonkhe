/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import SettingsPanel from "@/components/marshal/SettingsPanel";

export default function MarshalSettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black text-white uppercase tracking-wide">
          Settings
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Rank preferences for this device
        </p>
      </div>
      <SettingsPanel />
    </div>
  );
}
