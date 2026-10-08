"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505] px-4">
      <div className="w-full max-w-md rounded-3xl border border-red-900/40 bg-white/80 p-8 text-center shadow-lg shadow-red-950/10 backdrop-blur-sm dark:bg-[#0F0F10]/90">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400">
          System error
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          The page hit an unexpected issue. Please retry to continue your work.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-500"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
