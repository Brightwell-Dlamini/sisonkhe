"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shows domain-engine consequence preview before a critical action commits.
 */

import { AlertTriangle, CheckCircle2, Lock, RotateCcw } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { ConsequencePreview, Severity } from "@/lib/intelligence/types";
import { useState } from "react";

function severityDot(sev: Severity): string {
  switch (sev) {
    case "critical":
      return "bg-red-500";
    case "high":
      return "bg-amber-500";
    case "medium":
      return "bg-sky-500";
    case "low":
      return "bg-zinc-500";
    default:
      return "bg-zinc-600";
  }
}

interface Props {
  open: boolean;
  preview: ConsequencePreview | null;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  variant?: "danger" | "primary";
}

export function ConsequencePreviewDialog({
  open,
  preview,
  confirmLabel,
  onConfirm,
  onCancel,
  variant = "danger",
}: Props) {
  const [loading, setLoading] = useState(false);

  if (!preview) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  const blocked = preview.blockers.length > 0;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="md"
      title={preview.action}
      description={preview.subjectLabel}
    >
      <div className="space-y-4">
        <p className="text-xs text-zinc-400 leading-relaxed">{preview.summary}</p>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-3 py-2 border-b border-white/[0.06] text-[10px] font-black uppercase tracking-widest text-zinc-500">
            What will happen
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {preview.effects.map((fx, i) => (
              <li key={i} className="flex items-start gap-2.5 px-3 py-2.5">
                <span
                  className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${severityDot(fx.severity)}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-zinc-200 leading-snug">{fx.effect}</div>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-500">
                    {fx.reversible ? (
                      <>
                        <RotateCcw className="w-3 h-3" />
                        Reversible
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        Permanent record
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {blocked && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                Blockers
              </div>
              <ul className="mt-1 space-y-0.5">
                {preview.blockers.map((b, i) => (
                  <li key={i} className="text-xs text-amber-200/90">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {!blocked && preview.recommended && (
          <div className="flex items-center gap-2 text-[11px] text-emerald-400/90">
            <CheckCircle2 className="w-3.5 h-3.5" />
            No blockers — safe to proceed from domain rules
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" size="md" onClick={onCancel} fullWidth>
            Cancel
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            size="md"
            onClick={handleConfirm}
            loading={loading}
            disabled={blocked && variant === "primary"}
            fullWidth
          >
            {confirmLabel ?? preview.action}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
