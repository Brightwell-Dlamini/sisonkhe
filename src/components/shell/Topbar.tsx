"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { ResolvedUser } from "@/lib/auth/roles";
import type { Role, NavGroup } from "@/config/navigation";
import { findActiveItem } from "@/lib/navigation/resolve";
import NotificationsMenu from "./NotificationsMenu";
import UserMenu from "./UserMenu";
import SyncStatusPill from "@/components/offline/SyncStatusPill";

interface Props {
  user: ResolvedUser;
  role: Role;
  groups: NavGroup[];
  onOpenMobileNav: () => void;
}

export default function Topbar({
  user,
  role,
  groups,
  onOpenMobileNav,
}: Props) {
  const pathname = usePathname();
  const active = findActiveItem(pathname, groups);

  return (
    <header className="h-14 shrink-0 bg-[#0A0A0A]/95 backdrop-blur-lg border-b border-white/[0.06] flex items-center justify-between px-3 sm:px-5 sticky top-0 z-30">
      {/* Left: mobile menu + title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06]"
          aria-label="Open navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="min-w-0">
          <div className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">
            {active ? "Current page" : "Sisonkhe In Transit"}
          </div>
          <h1 className="text-sm font-black text-white uppercase tracking-tight truncate">
            {active?.label ?? "Dashboard"}
          </h1>
        </div>
      </div>

      {/* Right: sync pill + notifications + user */}
      <div className="flex items-center gap-1.5 shrink-0">
        <SyncStatusPill />
        <NotificationsMenu />
        <div className="w-px h-5 bg-white/[0.08] mx-1" />
        <UserMenu user={user} role={role} />
      </div>
    </header>
  );
}
