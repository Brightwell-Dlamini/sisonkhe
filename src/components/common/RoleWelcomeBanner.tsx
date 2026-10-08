import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
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
  const content = (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-white/[0.02] to-sky-500/10 p-4 sm:p-5",
        className
      )}
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            Welcome
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
            className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300 transition hover:border-emerald-400/40 hover:bg-emerald-500/15 sm:inline-flex"
          >
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );

  return content;
}
