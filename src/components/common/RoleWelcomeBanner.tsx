import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export function RoleWelcomeBanner({
  title,
  subtitle,
  actionLabel,
  actionHref,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F0F10] p-4 sm:p-5",
        className
      )}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            Today
          </div>
          <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">
            {subtitle}
          </p>
        </div>
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-200 transition hover:border-zinc-500 hover:bg-white/[0.06] sm:inline-flex"
          >
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
