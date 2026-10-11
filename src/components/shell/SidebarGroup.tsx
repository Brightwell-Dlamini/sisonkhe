"use client";

import type { NavGroup } from "@/config/navigation";
import SidebarItem from "./SidebarItem";

interface Props {
  group: NavGroup;
  onNavigate?: () => void;
  collapsed?: boolean;
}

export default function SidebarGroup({ group, onNavigate, collapsed }: Props) {
  return (
    <div>
      {!collapsed && (
        <div className="px-3 mb-2 text-[11px] font-semibold text-zinc-500 tracking-wide">
          {group.label}
        </div>
      )}
      <div className="space-y-0.5">
        {group.items.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        ))}
      </div>
    </div>
  );
}
