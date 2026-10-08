import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GuidanceItem {
  label: string;
  detail: string;
  href?: string;
  icon: LucideIcon;
}

export function RoleGuidance({
  title,
  items,
  className,
}: {
  title: string;
  items: GuidanceItem[];
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-white/[0.06] bg-[#0F0F10] p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
            Next steps
          </div>
          <h2 className="mt-1 text-sm font-black uppercase tracking-tight text-white">
            {title}
          </h2>
        </div>
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      </div>

      <div className="space-y-2">
        {items.map(({ label, detail, href, icon: Icon }) => {
          const body = (
            <div className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 transition hover:border-emerald-500/30 hover:bg-white/[0.04]">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">{label}</span>
                  {href && <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{detail}</p>
              </div>
            </div>
          );

          if (!href) return body;

          return (
            <Link key={label} href={href} className="block">
              {body}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
