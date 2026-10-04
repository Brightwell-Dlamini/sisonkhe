"use client";

import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: Props) {
  return (
    <header
      className={cn(
        "flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-black text-white uppercase tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </header>
  );
}
