"use client";

import Link from "next/link";
import { ExternalLink, ArrowLeft } from "lucide-react";

/** Hosting metrics belong in Vercel / Hostinger — not duplicated in-app. */
export default function Page() {
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-black uppercase text-white tracking-tight">
        Telemetry
      </h1>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Runtime metrics, deploy logs, and function performance are in your
        hosting dashboard. This app no longer mirrors them.
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href="https://vercel.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200 hover:border-zinc-500"
        >
          Open Vercel
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
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
