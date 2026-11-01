"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Assistant surface was removed from nav; keep route from 404ing bookmarks. */
export default function Page() {
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-black uppercase text-white tracking-tight">
        Assistant
      </h1>
      <p className="text-sm text-zinc-400 leading-relaxed">
        This surface is not part of the production control set. Use Command
        Centre and Compliance Queue for operational work.
      </p>
      <Link
        href="/admin/super"
        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Control Centre
      </Link>
    </div>
  );
}
