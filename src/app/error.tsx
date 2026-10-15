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
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4">
      <div className="w-full max-w-md surface-raised p-8 text-center ui-enter">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="text-meta text-rose-400">System error</p>
        <h1 className="mt-2 text-display text-xl">Something went wrong</h1>
        <p className="mt-2 text-body">
          This page hit an unexpected issue. Retry to continue your work.
        </p>
        {error.digest && (
          <p className="mt-3 text-micro font-mono text-zinc-600">{error.digest}</p>
        )}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white hover:bg-rose-500 touch-manipulation"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
