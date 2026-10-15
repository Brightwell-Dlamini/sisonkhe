import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4">
      <div className="w-full max-w-md surface-raised p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
          <Compass className="h-6 w-6" />
        </div>
        <p className="text-meta text-emerald-400">Route missing</p>
        <h1 className="mt-2 text-display text-xl">This page is not available</h1>
        <p className="mt-2 text-body">
          The destination could not be loaded, or the link is no longer valid.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-black hover:bg-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Return home
        </Link>
      </div>
    </div>
  );
}
