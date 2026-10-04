"use client";

import { cn } from "@/lib/utils";

interface Props {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-12 text-center",
        className
      )}
    >
      <div className="w-14 h-14 mx-auto rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-zinc-600" />
      </div>
      <h3 className="text-sm font-black text-white uppercase tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-zinc-500 mt-1.5 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
