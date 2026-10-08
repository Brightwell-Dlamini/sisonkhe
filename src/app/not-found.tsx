import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505] px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/80 p-8 text-center shadow-lg shadow-zinc-900/5 backdrop-blur-sm dark:bg-[#0F0F10]/90">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
          <Compass className="h-6 w-6" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600">
          Route missing
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
          This page is not available
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          The destination could not be loaded, or the link is no longer valid.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Return home
        </Link>
      </div>
    </div>
  );
}
