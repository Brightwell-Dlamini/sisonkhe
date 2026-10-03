"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NavGroup } from "@/config/navigation";
import SidebarGroup from "./SidebarGroup";

interface Props {
  groups: NavGroup[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}

export default function Sidebar({
  groups,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  mobile = false,
}: Props) {
  return (
    <aside
      className={`${
        mobile ? "w-64" : collapsed ? "w-16" : "w-60"
      } transition-all duration-200 flex flex-col bg-[#0A0A0A] border-r border-white/[0.06] h-full`}
    >
      {/* Brand */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2 min-w-0" onClick={onNavigate}>
          <span className="text-lg shrink-0">🇸🇿</span>
          {!collapsed && (
            <span className="font-black tracking-tight text-white truncate">
              Sisonkhe
            </span>
          )}
        </Link>
        {!mobile && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin">
        {groups.map((group) => (
          <SidebarGroup
            key={group.label}
            group={group}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-white/[0.06]">
          <div className="font-mono text-[9px] text-zinc-600 leading-tight">
            <div>v1.0.1 · SZ National</div>
            <div className="mt-0.5 text-zinc-700">© 2026 NRTC</div>
          </div>
        </div>
      )}
    </aside>
  );
}
