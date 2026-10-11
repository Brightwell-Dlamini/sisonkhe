"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NavGroup } from "@/config/navigation";
import SidebarGroup from "./SidebarGroup";
import BrandMark from "@/components/common/BrandMark";

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
        mobile ? "w-72" : collapsed ? "w-[4.25rem]" : "w-60"
      } transition-all duration-200 flex flex-col bg-[#080808] border-r border-white/[0.06] h-full`}
    >
      <div className="h-14 flex items-center justify-between px-3 border-b border-white/[0.06]">
        <Link
          href="/"
          className="flex items-center gap-2 min-w-0"
          onClick={onNavigate}
        >
          <BrandMark size="xs" showText={!collapsed} inverse />
        </Link>
        {!mobile && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {groups.map((group) => (
          <SidebarGroup
            key={group.label}
            group={group}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {!collapsed && (
        <div className="px-3 py-3 border-t border-white/[0.06]">
          <div className="text-[11px] text-zinc-600 leading-relaxed">
            <div>v1.0.1 · SZ National</div>
            <div className="mt-0.5 text-zinc-700">© 2026 NRTC</div>
          </div>
        </div>
      )}
    </aside>
  );
}
