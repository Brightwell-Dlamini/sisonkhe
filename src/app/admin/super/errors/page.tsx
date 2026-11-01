"use client";

import Link from "next/link";
import { ExternalLink, ArrowLeft } from "lucide-react";

/** Runtime errors and build logs: Vercel Observability / Hostinger. */
export default function Page() {
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-black uppercase text-white tracking-tight">
        Error logs
      </h1>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Application and build errors are in Vercel logs. Domain audit trails stay
        under Admin → Audit Trail.
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href="https://vercel.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200 hover:border-zinc-500"
        >
          Open Vercel logs
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <Link
          href="/admin/audits"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-white"
        >
          Audit Trail
        </Link>
        <Link
          href="/admin/super"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Control Centre
        </Link>
      </div>
    </div>
  );
}
