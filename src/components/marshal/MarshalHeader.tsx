/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { RefreshCw, MapPin } from "lucide-react";
import type { MarshalContext } from "@/lib/marshal/queries";
import SyncStatusPill from "@/components/offline/SyncStatusPill";
import { useLocale } from "@/hooks/useLocale";

interface Props {
  context: MarshalContext;
  onRefresh: () => void;
  loading: boolean;
}

export default function MarshalHeader({ context, onRefresh, loading }: Props) {
  const { t } = useLocale();

  return (
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              {t("marshal.on_duty")}
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-white">
            {context.fullName}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>
              {context.region} Region
              {context.assignedRouteId ? (
                <>
                  {" "}
                  • Route{" "}
                  <strong className="font-mono">{context.assignedRouteId}</strong>
                </>
              ) : null}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SyncStatusPill />
          <button
            onClick={onRefresh}
            disabled={loading}
            className="min-h-11 min-w-11 p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] text-zinc-300 disabled:opacity-50 touch-manipulation"
            title={t("marshal.refresh")}
            aria-label={t("marshal.refresh")}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
