"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/config/navigation";

interface Props {
  item: NavItem;
  onNavigate?: () => void;
  collapsed?: boolean;
}

export default function SidebarItem({ item, onNavigate, collapsed }: Props) {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);
  const Icon = item.icon;
  const isPrimary = item.emphasis === "primary";

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : item.hint ?? item.label}
      className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all ${
        isActive
          ? "bg-white/[0.06] text-white font-semibold"
          : isPrimary
            ? "text-zinc-200 font-medium hover:text-white hover:bg-white/[0.04]"
            : "text-zinc-400 font-medium hover:text-white hover:bg-white/[0.03]"
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-emerald-500" />
      )}

      <Icon
        className={`w-4 h-4 shrink-0 transition-colors ${
          isActive
            ? "text-emerald-400"
            : isPrimary
              ? "text-zinc-300 group-hover:text-emerald-400/80"
              : "text-zinc-500 group-hover:text-zinc-300"
        }`}
      />

      {!collapsed && <span className="truncate">{item.label}</span>}

      {item.badge === "live" && !collapsed && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 kiosk-pulse" />
      )}

      {isPrimary && !isActive && !collapsed && !item.badge && (
        <span className="ml-auto w-1 h-1 rounded-full bg-emerald-500/40" />
      )}
    </Link>
  );
}
