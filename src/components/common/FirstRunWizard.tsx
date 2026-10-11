/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Short 1–3 step welcome after first successful login.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, X } from "lucide-react";
import {
  hasCompletedFirstRun,
  markFirstRunComplete,
  type FirstRunRole,
} from "@/lib/ux/firstRun";

export type FirstRunStep = {
  title: string;
  body: string;
  href?: string;
  cta?: string;
};

const DEFAULTS: Record<FirstRunRole, FirstRunStep[]> = {
  driver: [
    {
      title: "You're signed in",
      body: "This is your driver desk. Check your vehicle and rank status here.",
    },
    {
      title: "What to do next",
      body: "Open My Vehicle to see assignment and compliance. Use Virtual Card for rank fees.",
      href: "/driver",
      cta: "Open my vehicle",
    },
    {
      title: "Stuck?",
      body: "Ask the marshal at your rank, or your supervisor. They can send a new access link if needed.",
    },
  ],
  marshal: [
    {
      title: "Rank shift ready",
      body: "Your board is the live queue. Dispatch from here — other tools sit under More.",
    },
    {
      title: "Primary job",
      body: "Keep the queue moving. Add vehicles, reorder, and dispatch when ready.",
      href: "/marshal",
      cta: "Open live queue",
    },
  ],
  operator: [
    {
      title: "Operator desk",
      body: "Fund your master card, link vehicles, then transfer for rank fees and renewals.",
    },
    {
      title: "Checklist",
      body: "1) Fund wallet · 2) Confirm fleet · 3) First transfer or renewal request.",
      href: "/operator/wallet",
      cta: "Open wallet",
    },
  ],
  inspector: [
    {
      title: "Roadside ready",
      body: "Use Roadside Lookup for plate, VIC, or QR checks. Tickets you issue appear under My Tickets.",
      href: "/inspector/scan",
      cta: "Start lookup",
    },
  ],
  admin: [
    {
      title: "Command centre",
      body: "Start on ranked work and risk. Use Send Access to activate drivers and marshals who enrolled at the portal.",
      href: "/admin/access",
      cta: "Open Send Access",
    },
  ],
};

interface Props {
  role: FirstRunRole;
  userId?: string;
  displayName?: string;
  steps?: FirstRunStep[];
}

export default function FirstRunWizard({ role, userId, displayName, steps }: Props) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const list = steps ?? DEFAULTS[role];

  useEffect(() => {
    if (!hasCompletedFirstRun(role, userId)) setOpen(true);
  }, [role, userId]);

  if (!open || list.length === 0) return null;

  const step = list[idx];
  const last = idx >= list.length - 1;

  function finish() {
    markFirstRunComplete(role, userId);
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#0F0F10] border border-white/[0.08] rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Welcome{displayName ? ` · ${displayName}` : ""}
            </div>
            <h2 className="text-base font-black text-white mt-1">{step.title}</h2>
          </div>
          <button
            type="button"
            onClick={finish}
            className="p-1.5 text-zinc-500 hover:text-zinc-200"
            aria-label="Skip"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-zinc-400 leading-relaxed">{step.body}</p>

        <div className="flex gap-1.5">
          {list.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i <= idx ? "bg-emerald-500" : "bg-zinc-700"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {!last ? (
            <button
              type="button"
              onClick={() => setIdx((v) => v + 1)}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : step.href ? (
            <Link
              href={step.href}
              onClick={finish}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              {step.cta ?? "Continue"} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Done
            </button>
          )}
          <button
            type="button"
            onClick={finish}
            className="px-4 py-2.5 bg-white/[0.06] text-zinc-400 rounded-xl text-xs font-bold"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
