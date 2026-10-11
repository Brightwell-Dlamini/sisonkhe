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
        "surface-raised p-10 sm:p-12 text-center",
        className
      )}
    >
      <div className="w-12 h-12 mx-auto rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-zinc-500" />
      </div>
      <h3 className="text-title">{title}</h3>
      {description && (
        <p className="text-body mt-2 max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
