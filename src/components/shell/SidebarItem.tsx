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

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
        isActive
          ? "bg-white/[0.06] text-white"
          : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
      }`}
    >
      {/* Active left bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-emerald-500" />
      )}

      <Icon
        className={`w-4 h-4 shrink-0 transition-colors ${
          isActive ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"
        }`}
      />

      {!collapsed && (
        <span className="truncate">{item.label}</span>
      )}

      {item.badge === "live" && !collapsed && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 kiosk-pulse" />
      )}
    </Link>
  );
}
